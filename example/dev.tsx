import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useEyeDropper, EyeDropper } from "../src/index";

const App = () => {
  // --- Hook Usage ---
  const { open, isSupported, status, activeStrategy } = useEyeDropper({
    strategy: "auto", // Try changing to: ["native", "screen-capture", "canvas"] or "canvas"
  });

  const pickWithHook = async () => {
    try {
      const color = await open();
      console.log("[Hook] Picked color:", color.hex);
    } catch (e) {
      console.error("[Hook] Picker failed or was aborted:", e);
    }
  };

  // --- Component Usage ---
  const [componentOn, setComponentOn] = useState(false);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>ya-react-eyedropper (v2) Testing Playground</h1>
      <p>
        Current fallback strategy: <code>auto</code> (Native → Canvas)
      </p>

      <div style={{ display: "flex", gap: 40, marginTop: 30 }}>
        {/* Hook Section */}
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 20, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>
            Hook (<code>useEyeDropper</code>)
          </h2>
          <p>Recommended approach. Has full access to loading states.</p>
          <button
            disabled={!isSupported || status !== "idle"}
            onClick={pickWithHook}
            style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
          >
            {status === "capturing" ? "Loading (Serializing DOM)..." : "Pick with Hook"}
          </button>

          <div style={{ marginTop: 20 }}>
            <strong>Last Used Strategy: </strong>
            <span
              style={{
                background: "#eee",
                padding: "4px 8px",
                borderRadius: 4,
                fontFamily: "monospace",
              }}
            >
              {activeStrategy || "None yet"}
            </span>
          </div>
        </div>

        {/* Component Section */}
        <div style={{ flex: 1, border: "1px solid #ddd", padding: 20, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>
            Component (<code>&lt;EyeDropper&gt;</code>)
          </h2>
          <p>Legacy declarative wrapper for backward compatibility.</p>
          <EyeDropper
            strategy="auto"
            on={componentOn}
            onPick={(color) => {
              setComponentOn(false);
              console.log("[Component] Picked color:", color.hex);
            }}
            onPickCancel={() => {
              setComponentOn(false);
              console.log("[Component] Picker cancelled");
            }}
          >
            <button
              onClick={() => setComponentOn(true)}
              style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}
            >
              Pick with Component
            </button>
          </EyeDropper>
        </div>
      </div>

      {/* Test subjects */}
      <div style={{ marginTop: 40 }}>
        <h3>Test Subjects:</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 100, height: 100, background: "#ff0000", borderRadius: 8 }} />
          <div style={{ width: 100, height: 100, background: "#00ff00", borderRadius: 8 }} />
          <div style={{ width: 100, height: 100, background: "#0000ff", borderRadius: 8 }} />
          <div
            style={{
              width: 100,
              height: 100,
              background: "linear-gradient(45deg, #ff00ff, #00ffff)",
              borderRadius: 8,
            }}
          />
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
