import { useRef, useEffect } from "react";
import type { LessonControl } from "../../../packages/knowledge/lesson-definitions";
import type { RuntimeAction, RuntimeSnapshot } from "@simulation/index";
function Momentary({
  label,
  deviceId,
  actuator,
  act,
  active,
  disabled,
}: {
  label: string;
  deviceId: string;
  actuator?: "start" | "stop";
  act: (a: RuntimeAction) => void;
  active: boolean;
  disabled: boolean;
}) {
  const pressed = useRef(false),
    actionRef = useRef(act);
  actionRef.current = act;
  useEffect(() => {
    const release = () => {
      if (!pressed.current) return;
      pressed.current = false;
      actionRef.current({ type: "operate", deviceId, state: false, actuator });
    };
    const visibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      release();
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [deviceId, actuator]);
  const set = (state: boolean) => {
    if (pressed.current === state) return;
    pressed.current = state;
    actionRef.current({ type: "operate", deviceId, state, actuator });
  };
  return (
    <button
      disabled={disabled}
      aria-pressed={active}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onBlur={() => set(false)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) set(true);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          set(false);
        }
      }}
    >
      {label}
    </button>
  );
}
export function ReferenceControls({
  controls,
  runtime,
  act,
  paused,
}: {
  controls: LessonControl[];
  runtime: RuntimeSnapshot;
  act: (a: RuntimeAction) => void;
  paused: boolean;
}) {
  return (
    <>
      {controls.map((c) =>
        c.kind === "momentary" ? (
          <Momentary
            key={`${c.deviceId}-${c.actuator ?? "press"}`}
            label={c.label}
            deviceId={c.deviceId}
            actuator={c.actuator}
            act={act}
            disabled={paused}
            active={
              c.actuator === "stop"
                ? !!runtime.devices[c.deviceId].stopPressed
                : runtime.devices[c.deviceId].manual
            }
          />
        ) : (
          <button
            key={`${c.deviceId}-${c.kind}`}
            disabled={paused}
            onClick={() =>
              act(
                c.kind === "test-rcd"
                  ? { type: "test-rcd", deviceId: c.deviceId }
                  : {
                      type: "operate",
                      deviceId: c.deviceId,
                      state:
                        c.kind === "reset"
                          ? false
                          : !runtime.devices[c.deviceId].manual,
                    },
              )
            }
          >
            {c.label}
          </button>
        ),
      )}
    </>
  );
}
