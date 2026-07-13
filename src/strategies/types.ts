export interface ColorSelectionResult {
  sRGBHex: string;
}

export interface ColorSelectionOptions {
  signal?: AbortSignal;
}

export interface IEyeDropperStrategy {
  open(options?: ColorSelectionOptions): Promise<ColorSelectionResult>;
  isSupported(): boolean;
}
