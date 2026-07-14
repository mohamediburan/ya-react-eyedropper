import { useCallback, useEffect, useRef, useState } from "react";
import { NativeStrategy } from "./strategies/NativeStrategy";
import { IEyeDropperStrategy } from "./strategies/types";
import { Color, EyeDropperError, EyeDropperProps, EyeDropperStatus, StrategyName } from "./types";
import { hexToHsl, hexToRgb, hexToRgba } from "./utils/colorConversion";
import { isNativeEyeDropperSupported, isScreenCaptureSupported } from "./utils/support";

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
  if (!input || input === "auto") return ["native", "canvas"];
  if (typeof input === "string") return [input];
  return input;
}

/**
 * Synchronously checks if at least one strategy in the chain is supported.
 */
function checkChainSupport(chain: StrategyName[]): boolean {
  for (const name of chain) {
    switch (name) {
      case "native":
        if (isNativeEyeDropperSupported()) return true;
        break;
      case "screen-capture":
        if (isScreenCaptureSupported()) return true;
        break;
      case "canvas":
        return true; // Always supported
    }
  }
  return false;
}

async function openWithFallback(
  chain: StrategyName[],
  options?: {
    signal?: AbortSignal;
    magnifier?: EyeDropperProps["magnifier"];
    onReady?: () => void;
  },
): Promise<{ sRGBHex: string; strategyName: StrategyName }> {
  let lastError: any;
  for (const name of chain) {
    const strategy = await strategyLoaders[name]();
    if (!strategy.isSupported()) continue;
    try {
      const result = await strategy.open(options);
      return { ...result, strategyName: name };
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
  const [status, setStatus] = useState<EyeDropperStatus>("idle");
  const [activeStrategy, setActiveStrategy] = useState<StrategyName | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const statusRef = useRef<EyeDropperStatus>("idle");
  const propsRef = useRef(props);

  // Keep refs in sync without triggering re-renders
  propsRef.current = props;

  const updateStatus = useCallback((newStatus: EyeDropperStatus) => {
    statusRef.current = newStatus;
    setStatus(newStatus);
  }, []);

  // Compute isSupported based on the entire resolved strategy chain
  const chain = resolveStrategies(props?.strategy);
  const isSupported = checkChainSupport(chain);

  const close = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateStatus("idle");
    setActiveStrategy(null);
  }, [updateStatus]);

  const open = useCallback(async (): Promise<Color> => {
    // Read from ref to avoid status being in the dependency array
    if (statusRef.current !== "idle") {
      // Abort previous session
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    updateStatus("capturing");
    setActiveStrategy(null);

    try {
      const currentProps = propsRef.current;
      const resolvedChain = resolveStrategies(currentProps?.strategy);
      const result = await openWithFallback(resolvedChain, {
        signal: controller.signal,
        magnifier: currentProps?.magnifier,
        onReady: () => updateStatus("picking"),
      });

      setActiveStrategy(result.strategyName);

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

      updateStatus("idle");
      return color;
    } catch (err: any) {
      updateStatus("idle");
      setActiveStrategy(null);

      if (err instanceof DOMException && err.name === "AbortError") {
        const error: EyeDropperError = { code: "ABORTED", message: "User aborted the selection" };
        propsRef.current?.onError?.(error);
        throw error;
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

      propsRef.current?.onError?.(error);
      throw error;
    }
  }, [updateStatus]); // Stable: no props/status in deps

  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  // Derive isPicking for backward compatibility
  const isPicking = status !== "idle";

  return { open, close, isSupported, isPicking, status, activeStrategy };
}
