import { snapdom } from "@zumer/snapdom";
import { MagnifierOptions } from "../types";
import { Magnifier } from "../ui/Magnifier";
import { Overlay } from "../ui/Overlay";
import { extractPixelColor } from "../utils/pixelExtraction";
import { ColorSelectionOptions, ColorSelectionResult, IEyeDropperStrategy } from "./types";

export class CanvasStrategy implements IEyeDropperStrategy {
  private overlay: Overlay | null = null;
  private magnifier: Magnifier | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private captureInstance: any | null = null;
  private resolve: ((result: ColorSelectionResult) => void) | null = null;
  private reject: ((error: any) => void) | null = null;
  private abortHandler: (() => void) | null = null;
  private options?: ColorSelectionOptions & { magnifier?: MagnifierOptions };

  isSupported(): boolean {
    return true; // Always supported as fallback
  }

  async open(
    options?: ColorSelectionOptions & { magnifier?: MagnifierOptions },
  ): Promise<ColorSelectionResult> {
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

    try {
      this.captureInstance = await snapdom(document.documentElement, {
        scale: window.devicePixelRatio || 1,
      });
      this.canvas = await this.captureInstance!.toCanvas();
    } catch (err) {
      const error = new Error("CANVAS_RENDER_FAILED");
      (error as any).originalError = err;
      throw error;
    }

    const ctx = this.canvas!.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("CANVAS_CONTEXT_FAILED");
    }
    this.canvasCtx = ctx;

    this.overlay.hideLoading();
    this.magnifier = new Magnifier(this.canvas!, {
      ...this.options?.magnifier,
      isViewportOnly: false
    });

    this.bindEvents();
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

    if (!this.magnifier["isVisible"]) {
      this.magnifier.show();
    }

    try {
      const hex = extractPixelColor(this.canvasCtx, clientX, clientY, false);
      this.magnifier.setCurrentColor(hex);
      this.magnifier.move(clientX, clientY, offsetX, offsetY);
    } catch (err) {
      // CORS tainted canvas will throw here
      if (err instanceof DOMException && err.name === "SecurityError") {
        const error = new Error("CANVAS_TAINTED");
        (error as any).originalError = err;
        this.cleanup(error);
      }
    }
  }

  private onClick(e: MouseEvent | TouchEvent) {
    if (e instanceof TouchEvent) e.preventDefault();
    if (!this.magnifier || !this.resolve) return;

    const hex = this.magnifier["currentHex"];
    if (hex) {
      const resolve = this.resolve;
      this.cleanup();
      resolve({ sRGBHex: hex });
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      this.cleanup(new DOMException("Aborted", "AbortError"));
    }
  }

  private cleanup(error?: any) {
    if (this.abortHandler && this.options?.signal) {
      this.options.signal.removeEventListener("abort", this.abortHandler);
    }
    this.abortHandler = null;

    this.magnifier?.destroy();
    this.overlay?.destroy();

    this.captureInstance = null;
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
