import React, { useEffect, useRef } from "react";
import { EyeDropperProps } from "./types";
import { useEyeDropper } from "./useEyeDropper";

export const EyeDropper: React.FC<EyeDropperProps> = ({
  on,
  onPick,
  onPickCancel,
  onError,
  strategy,
  magnifier,
  children,
}) => {
  const { open, close, isPicking } = useEyeDropper({
    strategy,
    magnifier,
    onError,
  });

  // Use refs to always have the latest callbacks without triggering re-effects
  const onPickRef = useRef(onPick);
  const onPickCancelRef = useRef(onPickCancel);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onPickRef.current = onPick;
    onPickCancelRef.current = onPickCancel;
    onErrorRef.current = onError;
  }, [onPick, onPickCancel, onError]);

  useEffect(() => {
    if (on && !isPicking) {
      open()
        .then((color) => {
          if (onPickRef.current) {
            onPickRef.current(color);
          }
        })
        .catch((error) => {
          if (error.code === "ABORTED" && onPickCancelRef.current) {
            onPickCancelRef.current();
          } else if (error.code !== "ABORTED") {
            // Already handled by onError prop passed to hook, but we can do fallback logic here
            // If the user didn't provide onError, we fall back to onPickCancel for backward compatibility
            if (!onErrorRef.current && onPickCancelRef.current) {
              onPickCancelRef.current();
            }
          }
        });
    } else if (!on && isPicking) {
      close();
    }
  }, [on, isPicking, open, close]);

  return <>{children}</>;
};
