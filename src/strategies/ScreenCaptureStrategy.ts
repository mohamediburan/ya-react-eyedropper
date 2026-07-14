import { MagnifierOptions } from "../types";
import { Magnifier } from "../ui/Magnifier";
import { Overlay } from "../ui/Overlay";
import { extractPixelColor } from "../utils/pixelExtraction";
import { isScreenCaptureSupported } from "../utils/support";
import { ColorSelectionOptions, ColorSelectionResult, IEyeDropperStrategy } from "./types";

export class ScreenCaptureStrategy implements IEyeDropperStrategy {
  private overlay: Overlay | null = null;
  private magnifier: Magnifier | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private resolve: ((result: ColorSelectionResult) => void) | null = null;
  private reject: ((error: any) => void) | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private abortHandler: (() => void) | null = null;
  private options?: ColorSelectionOptions & { magnifier?: MagnifierOptions };
  private cursorX: number = 0;
  private cursorY: number = 0;

  isSupported(): boolean {
    return isScreenCaptureSupported();
  }

  async open(
    options?: ColorSelectionOptions & { magnifier?: MagnifierOptions },
  ): Promise<ColorSelectionResult> {
    if (!this.isSupported()) {
      throw new Error("NOT_SUPPORTED");
    }

    this.options = options;

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;

      if (options?.signal) {
        if (options.signal.aborted) {
          return this.cleanup(new DOMException("Aborted", "AbortError"));
        }
        this.abortHandler = () =>
          this.cleanup(options.signal?.reason || new DOMException("Aborted", "AbortError"));
        options.signal.addEventListener("abort", this.abortHandler);
      }

      this.start().catch((err) => {
        this.cleanup(err);
      });
    });
  }

  private async start() {
    this.overlay = new Overlay();
    this.overlay.showLoading();

    // Initialize cursor to center of viewport
    this.cursorX = Math.round(window.innerWidth / 2);
    this.cursorY = Math.round(window.innerHeight / 2);

    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as any, // TS might not have displaySurface yet
        preferCurrentTab: true,
      } as any);
    } catch (err) {
      const error = new Error("PERMISSION_DENIED");
      (error as any).originalError = err;
      throw error;
    }

    this.video = document.createElement("video");
    this.video.srcObject = this.stream;
    this.video.autoplay = true;

    await new Promise<void>((resolve) => {
      if (!this.video) return;
      this.video.onloadedmetadata = () => {
        resolve();
      };
    });

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("CANVAS_CONTEXT_FAILED");
    }
    this.canvasCtx = ctx;

    // Draw the video frame exactly 1:1
    this.canvasCtx.drawImage(this.video, 0, 0);

    // Stop tracks immediately
    this.stream.getTracks().forEach((track) => track.stop());

    this.overlay.hideLoading();
    this.magnifier = new Magnifier(this.canvas, {
      ...this.options?.magnifier,
      isViewportOnly: true,
    });

    this.options?.onReady?.();
    this.bindEvents();

    // Initialize the color at the starting cursor position
    this.handleMove(this.cursorX, this.cursorY);
  }

  private bindEvents() {
    if (!this.overlay) return;

    // Bind pointer events
    this.overlay.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.overlay.addEventListener("click", this.onClick.bind(this));

    this.overlay.addEventListener("touchmove", this.onTouchMove.bind(this), { passive: false });
    this.overlay.addEventListener("touchstart", this.onTouchStart.bind(this), { passive: false });
    this.overlay.addEventListener("touchend", this.onClick.bind(this));

    // Bind keyboard
    this.overlay.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  private onMouseMove(e: MouseEvent) {
    this.handleMove(e.clientX, e.clientY);
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault(); // lock viewport
    if (e.touches.length > 0) {
      this.handleMove(e.touches[0].clientX, e.touches[0].clientY, 0, -80); // Offset magnifier above finger
    }
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault(); // lock viewport
    if (e.touches.length > 0) {
      this.handleMove(e.touches[0].clientX, e.touches[0].clientY, 0, -80);
    }
  }

  private handleMove(clientX: number, clientY: number, offsetX: number = 0, offsetY: number = 0) {
    if (!this.canvasCtx || !this.magnifier) return;

    const targetX = clientX + offsetX;
    const targetY = clientY + offsetY;

    // Track cursor position for keyboard navigation
    this.cursorX = targetX;
    this.cursorY = targetY;

    if (!this.magnifier["isVisible"]) {
      this.magnifier.show();
    }

    try {
      const hex = extractPixelColor(this.canvasCtx, targetX, targetY, true);
      this.magnifier.setCurrentColor(hex);
      // Pass the target coordinates without re-applying the offset
      this.magnifier.move(targetX, targetY, 0, 0);
    } catch {
      // Ignore out of bounds
    }
  }

  private pickColor() {
    if (!this.magnifier || !this.resolve) return;

    const hex = this.magnifier["currentHex"];
    if (hex) {
      const resolve = this.resolve;
      this.cleanup();
      resolve({ sRGBHex: hex });
    }
  }

  private onClick(e: MouseEvent | TouchEvent) {
    if (e instanceof TouchEvent) e.preventDefault();
    this.pickColor();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.cleanup(new DOMException("Aborted", "AbortError"));
      return;
    }

    // Arrow key navigation: move cursor 1px (or 10px with Shift)
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case "ArrowUp":
          this.cursorY -= step;
          break;
        case "ArrowDown":
          this.cursorY += step;
          break;
        case "ArrowLeft":
          this.cursorX -= step;
          break;
        case "ArrowRight":
          this.cursorX += step;
          break;
      }
      // Clamp to viewport bounds
      this.cursorX = Math.max(0, Math.min(this.cursorX, window.innerWidth - 1));
      this.cursorY = Math.max(0, Math.min(this.cursorY, window.innerHeight - 1));
      this.handleMove(this.cursorX, this.cursorY);
      return;
    }

    // Enter or Space to pick the color at the current cursor position
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.pickColor();
    }
  }

  private cleanup(error?: any) {
    if (this.abortHandler && this.options?.signal) {
      this.options.signal.removeEventListener("abort", this.abortHandler);
    }
    this.abortHandler = null;

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }

    this.magnifier?.destroy();
    this.overlay?.destroy();

    this.video = null;
    this.stream = null;
    this.canvasCtx = null;
    this.canvas = null;
    this.magnifier = null;
    this.overlay = null;

    if (error && this.reject) {
      this.reject(error);
    }

    this.resolve = null;
    this.reject = null;
  }
}
