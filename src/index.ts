"use client";

export { EyeDropper } from "./EyeDropper";
export { useEyeDropper } from "./useEyeDropper";
export type {
  Color,
  EyeDropperProps,
  EyeDropperStatus,
  EyeDropperStrategy,
  EyeDropperErrorCode,
  EyeDropperError,
  MagnifierOptions,
  StrategyName,
} from "./types";
export { ErrorCodes } from "./types";
export { isNativeEyeDropperSupported } from "./utils/support";
