export interface ColorSelectionResult {
  sRGBHex: string;
}

export interface ColorSelectionOptions {
  signal?: AbortSignal;
  onReady?: () => void;
}

export interface IEyeDropperStrategy {
  open(options?: ColorSelectionOptions): Promise<ColorSelectionResult>;
  isSupported(): boolean;
}
