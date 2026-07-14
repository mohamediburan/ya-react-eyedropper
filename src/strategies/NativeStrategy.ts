import { isNativeEyeDropperSupported } from "../utils/support";
import { ColorSelectionOptions, ColorSelectionResult, IEyeDropperStrategy } from "./types";

export class NativeStrategy implements IEyeDropperStrategy {
  isSupported(): boolean {
    return isNativeEyeDropperSupported();
  }

  async open(options?: ColorSelectionOptions): Promise<ColorSelectionResult> {
    if (!this.isSupported()) {
      throw new Error("NOT_SUPPORTED");
    }
    const eyeDropper = new (window as any).EyeDropper();
    options?.onReady?.();
    return eyeDropper.open(options);
  }
}
