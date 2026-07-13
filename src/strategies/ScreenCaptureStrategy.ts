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

    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" } as any, // TS might not have displaySurface yet
      });
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
    this.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.canvas.height = window.innerHeight * window.devicePixelRatio;

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      throw new Error("CANVAS_CONTEXT_FAILED");
    }
    this.canvasCtx = ctx;

    // Draw the video frame
    this.canvasCtx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Stop tracks immediately
    this.stream.getTracks().forEach((track) => track.stop());

    this.overlay.hideLoading();
    this.magnifier = new Magnifier(this.canvas, {
      ...this.options?.magnifier,
      isViewportOnly: true
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
      const hex = extractPixelColor(this.canvasCtx, clientX, clientY, true);
      this.magnifier.setCurrentColor(hex);
      this.magnifier.move(clientX, clientY, offsetX, offsetY);
    } catch {
      // Ignore out of bounds
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
