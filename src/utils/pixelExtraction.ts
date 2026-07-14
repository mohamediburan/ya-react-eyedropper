export function extractPixelColor(
  canvasCtx: CanvasRenderingContext2D,
  clientX: number,
  clientY: number,
  isViewportOnly: boolean = false,
): string {
  // Correct for device pixel ratio and scroll position
  const x = (clientX + (isViewportOnly ? 0 : window.scrollX)) * window.devicePixelRatio;
  const y = (clientY + (isViewportOnly ? 0 : window.scrollY)) * window.devicePixelRatio;

  const px = Math.floor(x);
  const py = Math.floor(y);

  const data = canvasCtx.getImageData(px, py, 1, 1).data;

  // Convert Uint8ClampedArray [r, g, b, a] to hex
  const r = data[0].toString(16).padStart(2, "0");
  const g = data[1].toString(16).padStart(2, "0");
  const b = data[2].toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}
