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
    const height = size + (this.options.showColorPreview ? 40 : 0);
    
    // Scale for high DPI displays (Retina)
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${height}px`;
    
    this.ctx.scale(dpr, dpr);

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

    const px = Math.floor(sx);
    const py = Math.floor(sy);

    // Grab an integer number of raw pixels that will cover the magnifier area
    const cropPixels = Math.ceil(size / zoom) + 2;
    const startX = px - Math.floor(cropPixels / 2);
    const startY = py - Math.floor(cropPixels / 2);

    this.ctx.imageSmoothingEnabled = false; // Important for pixelated look
    this.ctx.save();
    
    // 1. Move to the exact center of the magnifier UI
    this.ctx.translate(size / 2, size / 2);
    // 2. Scale by zoom
    this.ctx.scale(zoom, zoom);
    // 3. Move the geometric center of the targeted raw pixel to the origin
    const offsetX = (px - startX) + 0.5;
    const offsetY = (py - startY) + 0.5;
    this.ctx.translate(-offsetX, -offsetY);

    // Draw white background so transparent pixels don't bleed the underlying DOM
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, cropPixels, cropPixels);

    // Draw the integer crop
    this.ctx.drawImage(
      this.originalCanvas,
      startX, startY, cropPixels, cropPixels,
      0, 0, cropPixels, cropPixels
    );
    
    this.ctx.restore();

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
