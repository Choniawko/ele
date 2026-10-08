import { useRef } from "react";
import type { RuntimeAction, RuntimeSnapshot } from "@simulation/index";
function Momentary({
  label,
  deviceId,
  actuator,
  act,
}: {
  label: string;
  deviceId: string;
  actuator?: "start" | "stop";
  act: (a: RuntimeAction) => void;
}) {
  const pressed = useRef(false);
  const set = (state: boolean) => {
    if (pressed.current === state) return;
    pressed.current = state;
    act({ type: "operate", deviceId, state, actuator });
  };
  return (
    <button
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
  motor,
  runtime,
  act,
}: {
  motor: boolean;
  runtime: RuntimeSnapshot;
  act: (a: RuntimeAction) => void;
}) {
  return (
    <>
      {(motor ? ["Q1", "Q2"] : ["Q1", "Q2", "B6", "B10", "RCD"]).map((id) => (
        <button
          key={id}
          onClick={() =>
            act({
              type: "operate",
              deviceId: id,
              state: !runtime.devices[id].manual,
            })
          }
        >
          Przełącz {id} w lekcji
        </button>
      ))}
      {motor ? (
        <>
          {["S1", "S3"].flatMap((id) =>
            ["start", "stop"].map((actuator) => (
              <Momentary
                key={`${id}-${actuator}`}
                label={`${id} ${actuator.toUpperCase()} — przytrzymaj`}
                deviceId={id}
                actuator={actuator as "start" | "stop"}
                act={act}
              />
            )),
          )}
          {["S2", "S4"].map((id) => (
            <Momentary
              key={id}
              label={`${id} LEWY — przytrzymaj`}
              deviceId={id}
              act={act}
            />
          ))}
          <button
            onClick={() =>
              act({ type: "operate", deviceId: "Q2", state: false })
            }
          >
            RESET / OFF Q2 w lekcji
          </button>
        </>
      ) : (
        <button onClick={() => act({ type: "test-rcd", deviceId: "RCD" })}>
          TEST RCD w lekcji
        </button>
      )}
    </>
  );
}
