import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useEyeDropper, EyeDropper } from "../src/index";

import "./style.css";

const App = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<"auto" | "native" | "canvas">("auto");
  const [lastColor, setLastColor] = useState<string | null>(null);

  // --- Hook Usage ---
  const { open, isSupported, status, activeStrategy } = useEyeDropper({
    strategy: selectedStrategy as any,
  });

  const pickWithHook = async () => {
    try {
      const color = await open();
      setLastColor(color.hex);
      console.log("[Hook] Picked color:", color.hex);
    } catch (e) {
      console.error("[Hook] Picker failed or was aborted:", e);
    }
  };

  // --- Component Usage ---
  const [componentOn, setComponentOn] = useState(false);

  return (
    <div>
      <h1>ya-react-eyedropper (v2) Testing Playground</h1>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <p style={{ margin: 0 }}>
          <strong>Strategy:</strong>
        </p>
        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value as any)}
          style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="auto">Auto (Native → Canvas)</option>
          <option value="native">Native Only</option>
          <option value="canvas">Canvas Only</option>
        </select>
      </div>

      {lastColor && (
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 18 }}>Last Picked Color:</strong>
          <div style={{ width: 40, height: 40, background: lastColor, borderRadius: 8, border: "1px solid #ddd" }} />
          <code style={{ fontSize: 18 }}>{lastColor}</code>
        </div>
      )}

      <div className="panel-container">
        {/* Hook Section */}
        <div className="panel">
          <h2>
            Hook (<code>useEyeDropper</code>)
          </h2>
          <p>Recommended approach. Has full access to loading states.</p>
          <button
            disabled={!isSupported || status !== "idle"}
            onClick={pickWithHook}
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
        <div className="panel">
          <h2>
            Component (<code>&lt;EyeDropper&gt;</code>)
          </h2>
          <p>Legacy declarative wrapper for backward compatibility.</p>
          <EyeDropper
            strategy={selectedStrategy}
            on={componentOn}
            onPick={(color) => {
              setComponentOn(false);
              setLastColor(color.hex);
              console.log("[Component] Picked color:", color.hex);
            }}
            onPickCancel={() => {
              setComponentOn(false);
              console.log("[Component] Picker cancelled");
            }}
          >
            <button onClick={() => setComponentOn(true)}>
              Pick with Component
            </button>
          </EyeDropper>
        </div>
      </div>

      {/* Test subjects */}
      <div style={{ marginTop: 40 }}>
        <h3>Test Subjects:</h3>
        <div className="color-grid">
          <div className="color-box" style={{ background: "#ff0000" }} />
          <div className="color-box" style={{ background: "#00ff00" }} />
          <div className="color-box" style={{ background: "#0000ff" }} />
          <div
            className="color-box"
            style={{
              background: "linear-gradient(45deg, #ff00ff, #00ffff)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
