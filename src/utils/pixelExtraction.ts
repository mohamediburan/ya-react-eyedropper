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

  // Composite over white background if pixel is transparent
  const alpha = data[3] / 255;
  const rNum = Math.round(data[0] * alpha + 255 * (1 - alpha));
  const gNum = Math.round(data[1] * alpha + 255 * (1 - alpha));
  const bNum = Math.round(data[2] * alpha + 255 * (1 - alpha));

  // Convert to hex
  const r = rNum.toString(16).padStart(2, "0");
  const g = gNum.toString(16).padStart(2, "0");
  const b = bNum.toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}
