import { MagnifierOptions } from "../types";

export class Magnifier {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private options: Required<MagnifierOptions>;
  private originalCanvas: HTMLCanvasElement;
  private rafId: number | null = null;
  private lastX: number = 0;
  private lastY: number = 0;
  private isVisible: boolean = false;
  private currentHex: string = "";
  private isViewportOnly: boolean = false;

  constructor(
    originalCanvas: HTMLCanvasElement,
    options?: MagnifierOptions & { isViewportOnly?: boolean },
  ) {
    this.originalCanvas = originalCanvas;
    this.isViewportOnly = options?.isViewportOnly ?? false;
    this.options = {
      radius: options?.radius ?? 60,
      zoom: options?.zoom ?? 8,
      borderColor: options?.borderColor ?? "#ffffff",
      borderWidth: options?.borderWidth ?? 2,
      showCrosshair: options?.showCrosshair ?? true,
      showColorPreview: options?.showColorPreview ?? true,
      showPixelGrid: options?.showPixelGrid ?? true,
    };

    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create magnifier context");
    this.ctx = ctx;

    const size = this.options.radius * 2;
    // Add extra padding to the canvas for the color preview swatch
    this.canvas.width = size;
    this.canvas.height = size + (this.options.showColorPreview ? 40 : 0);
    Object.assign(this.canvas.style, {
      position: "fixed",
      zIndex: "2147483648", // Above overlay
      pointerEvents: "none", // Let events pass through to overlay
      display: "none",
    });

    document.body.appendChild(this.canvas);
  }

  show() {
    this.isVisible = true;
    this.canvas.style.display = "block";
  }

  hide() {
    this.isVisible = false;
    this.canvas.style.display = "none";
  }

  setCurrentColor(hex: string) {
    this.currentHex = hex;
  }

  // Called on mouse/touch move
  move(clientX: number, clientY: number, offsetX: number = 0, offsetY: number = 0) {
    this.lastX = clientX;
    this.lastY = clientY;

    // Position the magnifier canvas
    this.canvas.style.left = `${clientX - this.options.radius + offsetX}px`;
    this.canvas.style.top = `${clientY - this.options.radius + offsetY}px`;

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.draw());
    }
  }

  private draw() {
    this.rafId = null;
    if (!this.isVisible) return;

    const {
      radius,
      zoom,
      borderColor,
      borderWidth,
      showCrosshair,
      showColorPreview,
      showPixelGrid,
    } = this.options;
    const size = radius * 2;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    this.ctx.clearRect(0, 0, cw, ch);

    // Draw circular magnifier
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
    this.ctx.clip();

    // Source coordinates from original canvas
    const dpr = window.devicePixelRatio || 1;
    const sx = (this.lastX + (this.isViewportOnly ? 0 : window.scrollX)) * dpr;
    const sy = (this.lastY + (this.isViewportOnly ? 0 : window.scrollY)) * dpr;

    const sourceSize = size / zoom;
    this.ctx.imageSmoothingEnabled = false; // Important for pixelated look
    this.ctx.drawImage(
      this.originalCanvas,
      sx - sourceSize / 2,
      sy - sourceSize / 2,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size,
    );

    // Pixel grid
    if (showPixelGrid) {
      this.ctx.strokeStyle = "rgba(0,0,0,0.1)";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      const pixelSize = zoom;
      for (let i = 0; i <= size; i += pixelSize) {
        // Offset by half pixel size to align grid
        const offset = (size / 2) % pixelSize;
        this.ctx.moveTo(i + offset, 0);
        this.ctx.lineTo(i + offset, size);
        this.ctx.moveTo(0, i + offset);
        this.ctx.lineTo(size, i + offset);
      }
      this.ctx.stroke();
    }

    // Crosshair
    if (showCrosshair) {
      this.ctx.strokeStyle = "rgba(0,0,0,0.5)"; // Shadow/contrast line
      this.ctx.lineWidth = 2;

      const center = radius;
      const chSize = 5;

      this.ctx.beginPath();
      // Horizontal
      this.ctx.moveTo(center - chSize, center);
      this.ctx.lineTo(center + chSize, center);
      // Vertical
      this.ctx.moveTo(center, center - chSize);
      this.ctx.lineTo(center, center + chSize);
      this.ctx.stroke();

      this.ctx.strokeStyle = "white"; // Main line
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    this.ctx.restore();

    // Border
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = borderWidth;
    this.ctx.beginPath();
    this.ctx.arc(radius, radius, radius - borderWidth / 2, 0, 2 * Math.PI);
    this.ctx.stroke();

    // Color preview swatch below
    if (showColorPreview && this.currentHex) {
      const pWidth = 80;
      const pHeight = 24;
      const px = radius - pWidth / 2;
      const py = size + 10;

      // Swatch background/border
      this.ctx.fillStyle = "#fff";
      this.ctx.beginPath();
      this.ctx.roundRect(px - 2, py - 2, pWidth + 4, pHeight + 4, 4);
      this.ctx.fill();

      // Color rect
      this.ctx.fillStyle = this.currentHex;
      this.ctx.beginPath();
      this.ctx.roundRect(px, py, pWidth, pHeight, 2);
      this.ctx.fill();

      // Text
      this.ctx.fillStyle = this.getContrastColor(this.currentHex);
      this.ctx.font = "12px monospace";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(this.currentHex.toUpperCase(), radius, py + pHeight / 2);
    }
  }

  private getContrastColor(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "black" : "white";
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
