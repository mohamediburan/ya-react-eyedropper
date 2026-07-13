export type StrategyName = "native" | "screen-capture" | "canvas";
export type EyeDropperStrategy = "auto" | StrategyName | StrategyName[];

export interface Color {
  sRGBHex: string;
  hex: string;
  rgb: string;
  rgba: string;
  hsl: string;
}

export interface MagnifierOptions {
  radius?: number;
  zoom?: number;
  borderColor?: string;
  borderWidth?: number;
  showCrosshair?: boolean;
  showColorPreview?: boolean;
  showPixelGrid?: boolean;
}

export type EyeDropperErrorCode =
  | "PERMISSION_DENIED" // getDisplayMedia permission denied
  | "SCREEN_CAPTURE_FAILED" // getDisplayMedia failed for other reason
  | "CANVAS_RENDER_FAILED" // @zumer/snapdom failed to render DOM
  | "CANVAS_TAINTED" // getImageData blocked due to cross-origin images (SecurityError)
  | "CANVAS_CONTEXT_FAILED" // Could not get 2D context
  | "NOT_SUPPORTED" // No strategy available
  | "ABORTED" // User cancelled via signal or Escape
  | "UNKNOWN";

export type EyeDropperError = {
  code: EyeDropperErrorCode;
  message: string;
  originalError?: Error;
};

export interface EyeDropperProps {
  on?: boolean;
  onPick?: (color: Color) => void;
  onPickCancel?: () => void;
  onError?: (error: EyeDropperError) => void;
  strategy?: EyeDropperStrategy;
  magnifier?: MagnifierOptions;
  children?: React.ReactNode;
}
