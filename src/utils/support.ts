export function isNativeEyeDropperSupported(): boolean {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)
  );
}
