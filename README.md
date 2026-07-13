# ya-react-eyedropper

_**yet Another react-eyedropper**_ (ya-react-eyedropper)

A fully controlled React Hook and Component for a robust, cross-browser Eyedropper API.

Version 2 is a complete rewrite that introduces a **multi-tiered strategy pattern**, a beautiful custom Magnifier UI, and drops the old `eyedropper-polyfill`. It dynamically falls back across three pixel-perfect capturing strategies to ensure it works on every device, without inflating your bundle size.

## Features

- **Native First:** Uses the lightweight, native `window.EyeDropper` API on supported browsers (Chrome, Edge).
- **Intelligent Fallbacks:** Seamlessly falls back to `ScreenCaptureStrategy` (using `getDisplayMedia`) or `CanvasStrategy` (using `@zumer/snapdom`) on browsers without native support (Firefox, Safari, Mobile).
- **Zero Bundle Bloat:** Fallback strategies and their heavy dependencies (like `@zumer/snapdom`) are dynamically loaded via `import()` and are **never downloaded** if the browser supports the native API.
- **Premium UX:** Includes a highly responsive, canvas-based magnifier with a precision crosshair, color swatch preview, and pixel grid.
- **Rich Color Output:** Returns colors in HEX, RGB, RGBA, and HSL formats.
- **Tree-shakeable:** Fully ESM and aggressively tree-shakeable (`"sideEffects": false`).

## Installation

```bash
npm install ya-react-eyedropper
```

## Usage (Hook - Recommended)

The new `useEyeDropper` hook is the recommended way to use the library.

```tsx
import { useEyeDropper } from "ya-react-eyedropper";

const App = () => {
  const { open, close, isSupported } = useEyeDropper({
    // Optional: customize the fallback behavior
    strategy: "auto", 
    // Optional: customize the magnifier UI
    magnifier: { radius: 60, zoom: 8, showPixelGrid: true },
    onError: (err) => console.error("Eyedropper error:", err.message),
  });

  const pickColor = async () => {
    try {
      const color = await open();
      console.log(color.sRGBHex, color.rgb, color.hsl);
    } catch (e) {
      if (e.code === "ABORTED") {
        console.log("User cancelled the picker");
      }
    }
  };

  return (
    <div>
      <button disabled={!isSupported} onClick={pickColor}>
        Pick Color
      </button>
    </div>
  );
};
```

## Usage (Component)

The classic component wrapper is still available and backward compatible with v1, though updated to support the new features.

```tsx
import { useState } from "react";
import { Color, EyeDropper } from "ya-react-eyedropper";

const App = () => {
  const [on, setOn] = useState(false);

  const onPick = (color: Color) => {
    setOn(false);
    console.log(color.sRGBHex);
  };

  const onPickCancel = () => setOn(false);

  return (
    <EyeDropper 
      on={on} 
      onPick={onPick} 
      onPickCancel={onPickCancel}
      strategy="auto"
    >
      <button onClick={() => setOn(true)}>Pick Color</button>
    </EyeDropper>
  );
};
```

## The Strategy Pattern

The `strategy` prop allows you to control exactly how the eyedropper falls back. It accepts a string or an ordered array of strategies.

- `"native"`: `window.EyeDropper`
- `"screen-capture"`: `getDisplayMedia` (Requires user permission to share tab)
- `"canvas"`: `@zumer/snapdom` DOM-to-canvas rendering

```tsx
// Default: Tries native -> screen-capture -> canvas
<EyeDropper strategy="auto" />

// Array: Tries native -> canvas (skips screen-capture permission prompt entirely)
<EyeDropper strategy={["native", "canvas"]} />

// String: Forces canvas strategy
<EyeDropper strategy="canvas" />
```

## API Reference

### `Color` Object
Returned when a color is successfully picked:
```typescript
{
  sRGBHex: string; // "#ff0000"
  hex: string;     // "#ff0000"
  rgb: string;     // "rgb(255, 0, 0)"
  rgba: string;    // "rgba(255, 0, 0, 1)"
  hsl: string;     // "hsl(0, 100%, 50%)"
}
```

### `MagnifierOptions`
Customize the fallback UI:
```typescript
{
  radius?: number;           // Default: 60
  zoom?: number;             // Default: 8
  borderColor?: string;      // Default: "#ffffff"
  borderWidth?: number;      // Default: 2
  showCrosshair?: boolean;   // Default: true
  showColorPreview?: boolean;// Default: true
  showPixelGrid?: boolean;   // Default: true
}
```

## Known Limitations

- The Canvas strategy cannot accurately render cross-origin `<iframe>` contents due to browser security (CORS) restrictions.
- The Screen Capture strategy requires the user to grant permission via a "Share this tab" browser dialog.

## License
[MIT](https://github.com/mohamediburan/ya-react-eyedropper/blob/main/LICENSE)
