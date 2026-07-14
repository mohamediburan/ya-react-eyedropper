export function extractPixelColor(
  canvasCtx: CanvasRenderingContext2D,
  clientX: number,
  clientY: number,
  isViewportOnly: boolean = false,
): string {
  const scrollX = typeof window.visualViewport !== 'undefined' && window.visualViewport !== null ? window.visualViewport.pageLeft : window.scrollX;
  const scrollY = typeof window.visualViewport !== 'undefined' && window.visualViewport !== null ? window.visualViewport.pageTop : window.scrollY;

  // Calculate actual scaling factor of the canvas (mobile browsers may downscale huge canvases to save memory)
  const actualScaleX = canvasCtx.canvas.width / document.documentElement.scrollWidth;
  const actualScaleY = canvasCtx.canvas.height / document.documentElement.scrollHeight;

  // Correct for actual canvas scale and scroll position
  const x = (clientX + (isViewportOnly ? 0 : scrollX)) * actualScaleX;
  const y = (clientY + (isViewportOnly ? 0 : scrollY)) * actualScaleY;

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
