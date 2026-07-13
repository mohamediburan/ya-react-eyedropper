import { useCallback, useEffect, useRef, useState } from "react";
import { NativeStrategy } from "./strategies/NativeStrategy";
import { IEyeDropperStrategy } from "./strategies/types";
import { Color, EyeDropperError, EyeDropperProps, StrategyName } from "./types";
import { hexToHsl, hexToRgb, hexToRgba } from "./utils/colorConversion";
import { isNativeEyeDropperSupported } from "./utils/support";

const strategyLoaders: Record<StrategyName, () => Promise<IEyeDropperStrategy>> = {
  native: async () => new NativeStrategy(),
  "screen-capture": async () => {
    const { ScreenCaptureStrategy } = await import("./strategies/ScreenCaptureStrategy");
    return new ScreenCaptureStrategy();
  },
  canvas: async () => {
    const { CanvasStrategy } = await import("./strategies/CanvasStrategy");
    return new CanvasStrategy();
  },
};

function resolveStrategies(input: EyeDropperProps["strategy"]): StrategyName[] {
  if (!input || input === "auto") return ["native", "screen-capture", "canvas"];
  if (typeof input === "string") return [input];
  return input;
}

async function openWithFallback(
  chain: StrategyName[],
  options?: { signal?: AbortSignal; magnifier?: EyeDropperProps["magnifier"] },
): Promise<{ sRGBHex: string }> {
  let lastError: any;
  for (const name of chain) {
    const strategy = await strategyLoaders[name]();
    if (!strategy.isSupported()) continue;
    try {
      return await strategy.open(options);
    } catch (err: any) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err; // Aborts shouldn't fall through
      }
      lastError = err;
      continue; // silent fall-through to next strategy
    }
  }

  if (lastError) throw lastError;
  throw new Error("NOT_SUPPORTED");
}

export function useEyeDropper(props?: Omit<EyeDropperProps, "on" | "onPick" | "onPickCancel">) {
  const [isSupported, setIsSupported] = useState(true); // Optimistic default
  const [isPicking, setIsPicking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Just a quick check for UI rendering purposes
    if (props?.strategy === "native" && !isNativeEyeDropperSupported()) {
      setIsSupported(false);
    }
  }, [props?.strategy]);

  const close = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPicking(false);
  }, []);

  const open = useCallback(async (): Promise<Color> => {
    if (isPicking) {
      close();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsPicking(true);

    try {
      const chain = resolveStrategies(props?.strategy);
      const result = await openWithFallback(chain, {
        signal: controller.signal,
        magnifier: props?.magnifier,
      });

      const hex = result.sRGBHex;
      const rgb = hexToRgb(hex);
      const rgba = hexToRgba(hex);
      const hsl = hexToHsl(hex);

      const color: Color = {
        sRGBHex: hex,
        hex,
        rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
        rgba: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
        hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
      };

      setIsPicking(false);
      return color;
    } catch (err: any) {
      setIsPicking(false);

      if (err instanceof DOMException && err.name === "AbortError") {
        const error: EyeDropperError = { code: "ABORTED", message: "User aborted the selection" };
        props?.onError?.(error);
        throw error; // Rethrow so promise rejects
      }

      let code = "UNKNOWN";
      if (
        err.message === "PERMISSION_DENIED" ||
        err.message === "CANVAS_RENDER_FAILED" ||
        err.message === "CANVAS_TAINTED" ||
        err.message === "CANVAS_CONTEXT_FAILED" ||
        err.message === "NOT_SUPPORTED"
      ) {
        code = err.message;
      }

      const error: EyeDropperError = {
        code: code as any,
        message: err.message || "An unknown error occurred",
        originalError: err.originalError || err,
      };

      props?.onError?.(error);
      throw error;
    }
  }, [isPicking, close, props]);

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  return { open, close, isSupported, isPicking };
}
