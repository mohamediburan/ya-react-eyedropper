# ya-react-eyedropper

_**yet Another react-eyedropper**_ (ya-react-eyedropper)

[![Live Demo](https://img.shields.io/badge/Live%20Playground-000000?style=for-the-badge&logo=react)](https://mohamediburan.github.io/ya-react-eyedropper/)

A fully controlled React Hook and Component for a robust, cross-browser Eyedropper API.

Version 2 is a complete rewrite that introduces a **multi-tiered strategy pattern**, a beautiful custom Magnifier UI, and drops the old `eyedropper-polyfill`. It dynamically falls back across pixel-perfect capturing strategies to ensure it works on every device, without inflating your bundle size.

## Features

- **Native First:** Uses the lightweight, native `window.EyeDropper` API on supported browsers (Chrome, Edge).
- **Intelligent Fallback:** Seamlessly falls back to `CanvasStrategy` (using `@zumer/snapdom`) on browsers without native support (Firefox, Safari, Mobile).
- **Optional Screen Capture:** An opt-in `ScreenCaptureStrategy` is available for pixel-perfect accuracy when you need it (see [Screen Capture Strategy](#screen-capture-strategy-opt-in) below).
- **Zero Bundle Bloat:** Fallback strategies and their dependencies are dynamically loaded via `import()` and are **never downloaded** if the browser supports the native API.
- **Premium UX:** Includes a highly responsive, canvas-based magnifier with a precision crosshair, color swatch preview, and pixel grid.
- **Rich Color Output:** Returns colors in HEX, RGB, RGBA, and HSL formats.
- **Tree-shakeable:** Fully ESM and aggressively tree-shakeable (`"sideEffects": false`).

## Installation

```bash
npm install ya-react-eyedropper
```

## Usage (Hook — Recommended)

The `useEyeDropper` hook is the recommended way to use the library.

```tsx
import { useEyeDropper } from "ya-react-eyedropper";

const App = () => {
  const { open, close, isSupported, status } = useEyeDropper({
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
      <button disabled={!isSupported || status !== "idle"} onClick={pickColor}>
        {status === "capturing" ? "Loading..." : "Pick Color"}
      </button>
    </div>
  );
};
```

## Usage (Legacy Component)

> [!WARNING]
> We strongly recommend using the `useEyeDropper` hook instead of this component. The component wrapper is maintained primarily for backward compatibility with v1. The hook provides better control over the lifecycle, loading states (`status`), and avoids complex React `useEffect` synchronization under the hood.

If you strongly prefer a declarative approach or are upgrading from v1, the classic component wrapper is still available and updated to support all new v2 features.

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
    <EyeDropper on={on} onPick={onPick} onPickCancel={onPickCancel}>
      <button onClick={() => setOn(true)}>Pick Color</button>
    </EyeDropper>
  );
};
```

## Strategy Pattern

The `strategy` prop controls how the eyedropper captures screen content. It accepts a **string shorthand** or an **ordered array** of strategy names.

### Available Strategies

| Strategy           | Method                      | Permission Prompt?       | Accuracy                  | Bundle Cost            |
| ------------------ | --------------------------- | ------------------------ | ------------------------- | ---------------------- |
| `"native"`         | `window.EyeDropper`         | No                       | Perfect (OS-level)        | ~0 KB                  |
| `"canvas"`         | `@zumer/snapdom` DOM→canvas | No                       | Very high (DOM re-render) | ~46 KB gzipped (lazy)  |
| `"screen-capture"` | `getDisplayMedia`           | **Yes** (browser dialog) | Perfect (pixel-level)     | ~1.4 KB gzipped (lazy) |

### Default Behavior (`strategy="auto"`)

By default, the library tries **`native` → `canvas`**. Screen capture is deliberately excluded from the default chain because it triggers an intrusive browser permission dialog ("Share this tab?") that most end users won't expect from a color picker.

```tsx
// These are equivalent:
<EyeDropper strategy="auto" />
<EyeDropper strategy={["native", "canvas"]} />
```

### Custom Fallback Chains

Pass an array to define your own order. The library tries each strategy in sequence, silently skipping any that fail or aren't supported:

```tsx
// Include screen-capture in the chain (see section below)
<EyeDropper strategy={["native", "screen-capture", "canvas"]} />

// Force canvas only — useful for testing or when you know native isn't available
<EyeDropper strategy="canvas" />

// Only use native — fail immediately if unsupported
<EyeDropper strategy="native" />
```

---

## Screen Capture Strategy (Opt-in)

The `"screen-capture"` strategy uses the [`getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) API to capture the actual rendered pixels of the browser tab. It is **not** included in the default `"auto"` chain — you must explicitly opt in.

### When to use it

Use screen capture when you need **pixel-perfect accuracy** that the canvas strategy cannot provide. Specifically:

- **WebGL / `<canvas>` content:** `@zumer/snapdom` (the canvas strategy) works by cloning the DOM and re-rendering it. It cannot capture the contents of WebGL contexts, 2D canvas drawings, or `<video>` elements. Screen capture can.
- **Complex visual effects:** CSS `backdrop-filter`, `mix-blend-mode` compositing across layers, and other GPU-composited effects may not render identically when the DOM is cloned. Screen capture captures the final composited output exactly as the GPU rendered it.
- **Third-party iframes with `allow` policies:** If the iframe has a permissive `allow="display-capture"` policy, screen capture can read its pixels. The canvas strategy cannot render cross-origin iframes at all.

### When NOT to use it

- **Consumer-facing apps:** End users will see a browser-native "Share this tab?" dialog, which is confusing and alarming in the context of a color picker. Most users won't understand why a color picker needs screen sharing permissions.
- **Mobile browsers:** `getDisplayMedia` is not supported on any mobile browser (iOS Safari, Android Chrome). The strategy will be silently skipped.
- **Privacy-sensitive contexts:** The captured frame contains everything visible on the tab, including sensitive data. While we only extract a single pixel color and discard the frame immediately, the permission dialog itself may raise concerns.

### How to opt in

```tsx
// Recommended: Include it as a middle step between native and canvas
const { open } = useEyeDropper({
  strategy: ["native", "screen-capture", "canvas"],
});

// Or use it alone
const { open } = useEyeDropper({
  strategy: "screen-capture",
});
```

### What the user sees

1. The browser shows a **"Share this tab?"** dialog (this is mandatory and cannot be suppressed).
2. Once the user grants permission, a single video frame is captured and the media stream is immediately stopped.
3. The magnifier overlay appears and the user can pick a color.
4. If the user **denies** the permission, the library silently falls through to the next strategy in the chain (if any).

### Browser support

| Browser         | Supported? |
| --------------- | ---------- |
| Chrome 72+      | ✅         |
| Edge 79+        | ✅         |
| Firefox 66+     | ✅         |
| Safari 13+      | ✅         |
| Mobile browsers | ❌         |

---

## API Reference

### `useEyeDropper(options?)` Hook

Returns `{ open, close, isSupported, isPicking, status, activeStrategy }`.

**Options:**

| Option      | Type                                       | Default   | Description                     |
| ----------- | ------------------------------------------ | --------- | ------------------------------- |
| `strategy`  | `"auto" \| StrategyName \| StrategyName[]` | `"auto"`  | Controls the fallback chain     |
| `magnifier` | `MagnifierOptions`                         | See below | Customize the magnifier UI      |
| `onError`   | `(error: EyeDropperError) => void`         | —         | Called when all strategies fail |

**Return values:**

| Value            | Type                   | Description                                                                                                        |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `open`           | `() => Promise<Color>` | Opens the eyedropper. Resolves with a `Color` when the user picks.                                                 |
| `close`          | `() => void`           | Aborts the active eyedropper session.                                                                              |
| `isSupported`    | `boolean`              | Whether at least one strategy in the configured chain is supported in the current browser.                         |
| `isPicking`      | `boolean`              | `true` when the eyedropper is active (either capturing or picking). Derived from `status`.                         |
| `status`         | `EyeDropperStatus`     | `"idle"` → `"capturing"` → `"picking"` → `"idle"`. Use this to show loading spinners during the DOM capture phase. |
| `activeStrategy` | `StrategyName \| null` | The name of the strategy that was used for the last successful pick. `null` when idle or before first pick.        |

### `Color` Object

Returned by `open()` when a color is successfully picked:

```typescript
{
  sRGBHex: string; // "#ff0000"
  hex: string; // "#ff0000"
  rgb: string; // "rgb(255, 0, 0)"
  rgba: string; // "rgba(255, 0, 0, 1)"
  hsl: string; // "hsl(0, 100%, 50%)"
}
```

### `MagnifierOptions`

Customize the fallback UI magnifier:

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

### `EyeDropperError` Object

Passed to the `onError` callback:

```typescript
{
  code: "PERMISSION_DENIED" | "SCREEN_CAPTURE_FAILED" | "CANVAS_RENDER_FAILED"
      | "CANVAS_TAINTED" | "CANVAS_CONTEXT_FAILED" | "NOT_SUPPORTED"
      | "ABORTED" | "UNKNOWN";
  message: string;
  originalError?: Error;
}
```

### `ErrorCodes` Constant

A typed constant object for comparing error codes without string typos:

```typescript
import { ErrorCodes } from "ya-react-eyedropper";

if (error.code === ErrorCodes.CANVAS_TAINTED) {
  // handle tainted canvas
}
```

## Known Limitations

- **Canvas strategy & cross-origin iframes:** `@zumer/snapdom` cannot render cross-origin `<iframe>` content. Colors from those areas will appear as the iframe's background color.
- **Canvas strategy & GPU content:** WebGL canvases, `<video>` elements, and 2D `<canvas>` drawings are not captured by the canvas strategy. Use screen capture for these.
- **Screen capture & mobile:** `getDisplayMedia` is not available on any mobile browser.
- **Screen capture & permission:** The browser will always show a "Share this tab" dialog that cannot be suppressed or customized.

## License

[MIT](https://github.com/mohamediburan/ya-react-eyedropper/blob/main/LICENSE)
