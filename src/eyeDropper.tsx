import { useEffect, useMemo, useState, useCallback, FC, PropsWithChildren } from "react";

import "eyedropper-polyfill";

import { Color, EyeDropperProps } from "./types";

export const EyeDropper: FC<PropsWithChildren<EyeDropperProps>> = (props) => {
  const { on, onPick, onPickCancel, children } = props;

  const [pickingFromDocument, setPickingFromDocument] = useState(false);
  const eyeDropper = useMemo(() => new window.EyeDropper(), []);
  const [abortController, abortSignal] = useMemo((): [AbortController, AbortSignal] => {
    const controller = new window.AbortController();
    const signal = controller.signal;
    return [controller, signal];
  }, []);

  const cancelPickColor = useCallback(() => {
    abortController.abort();
    setPickingFromDocument(false);
    onPickCancel();
  }, [abortController, setPickingFromDocument, onPickCancel]);

  const exitPickingByEsc = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "Escape" && pickingFromDocument) {
        cancelPickColor();
      }
    },
    [pickingFromDocument, cancelPickColor],
  );

  useEffect(() => {
    if (pickingFromDocument) {
      document.addEventListener("keydown", exitPickingByEsc);
    }
    return () => document.removeEventListener("keydown", exitPickingByEsc);
  }, [pickingFromDocument, exitPickingByEsc]);

  const onPickStart = useCallback(() => {
    eyeDropper
      .open({ signal: abortSignal })
      .then(({ sRGBHex }) => {
        const color: Color = {
          hex: sRGBHex,
        };
        onPick(color);
      })
      .catch(() => {
        onPickCancel();
      });
  }, [eyeDropper, abortSignal, onPick, onPickCancel]);

  useEffect(() => {
    if (on) {
      onPickStart();
    }
  }, [on, onPickStart]);

  return <>{children}</>;
};
