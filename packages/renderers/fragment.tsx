import type { InternalConnection } from "@catalog/index";
import type { DeviceRuntime } from "@simulation/index";
import { connectionDisplay } from "@simulation/connections";
import type { DeviceProps } from "./index";
import { ElectricalSymbol } from "./electrical-symbol";

export const fragmentGeometry = {
  width: 180,
  height: 110,
  from: { x: 20, y: 55 },
  to: { x: 140, y: 55 },
};
export function fragmentClosed(c: InternalConnection, state?: DeviceRuntime) {
  return connectionDisplay(c, state).displayClosed;
}
export function DeviceFragment({
  connection: c,
  ownerId,
  ...props
}: DeviceProps & { connection: InternalConnection; ownerId?: string }) {
  const {
    device: d,
    state,
    selected,
    onTerminal,
    onExplainSymbol,
    highlighted,
    wireStart,
    red,
    black,
    showTerminals,
  } = props;
  const label =
    c.kind === "coil"
      ? "cewka"
      : c.condition === "stop-inverse"
        ? "STOP NC"
        : c.condition === "mechanism-inverse"
          ? "blokada NC"
          : ["no", "auxNO"].includes(c.id)
            ? "NO"
            : c.id === "start"
              ? "START NO"
              : c.id;
  return (
    <g
      className="schematic-vector"
      data-device={d.designation}
      data-symbol-fragment={c.id}
      data-mechanism={ownerId ?? d.id}
      data-closed={fragmentClosed(c, state)}
      data-state-view={connectionDisplay(c, state).displayMode}
    >
      <title>
        {connectionDisplay(c, state).displayMode === "mechanism"
          ? "Położenie mechanizmu — ciągłość sprawdź pomiarem"
          : `Rzeczywista ciągłość: ${fragmentClosed(c, state) ? "zamknięta droga" : "otwarta droga"}`}
      </title>
      <rect
        width="180"
        height="110"
        rx="4"
        fill={selected ? "#edf6eb" : "#fdfdf7"}
        stroke={selected ? "#557350" : "none"}
      />
      <text x="80" y="20" textAnchor="middle" fontSize="14" fill="#253f43">
        {d.designation} · {label}
      </text>
      <g transform="translate(20 55)">
        <ElectricalSymbol
          connection={c}
          isClosed={fragmentClosed(c, state)}
          active={!!state?.coil}
        />
      </g>
      <text x="80" y="100" textAnchor="middle" fontSize="10" fill="#536254">
        {connectionDisplay(c, state).displayMode === "mechanism"
          ? "Położenie mechanizmu · sprawdź ciągłość"
          : ownerId && ownerId !== d.id
            ? `mechanizm ${ownerId}`
            : `${d.designation} · wspólny mechanizm`}
      </text>
      {onExplainSymbol && (
        <g
          role="button"
          tabIndex={0}
          aria-label={`Wyjaśnij symbol ${d.designation} ${c.from}–${c.to}`}
          className="device-control"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onExplainSymbol(c.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onExplainSymbol(c.id);
            }
          }}
        >
          <circle cx="164" cy="20" r="8" fill="white" stroke="#557350" />
          <text x="164" y="24" textAnchor="middle" fontSize="11">
            ?
          </text>
        </g>
      )}
      {showTerminals &&
        [c.from, c.to].map((id, i) => {
          const key = `${d.id}:${id}`,
            at = i ? fragmentGeometry.to : fragmentGeometry.from;
          return (
            <g
              key={id}
              data-terminal={`${d.designation}:${id}`}
              className="terminal-control"
              role="button"
              tabIndex={0}
              aria-label={`${d.designation} / ${id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onTerminal?.({ deviceId: d.id, terminalId: id });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTerminal?.({ deviceId: d.id, terminalId: id });
                }
              }}
            >
              <circle cx={at.x} cy={at.y} r="12" fill="transparent" />
              <circle
                cx={at.x}
                cy={at.y}
                r="4"
                fill={
                  red === key
                    ? "#cf4545"
                    : black === key
                      ? "#333"
                      : highlighted?.includes(key) || wireStart === key
                        ? "#f5d386"
                        : "white"
                }
                stroke="#253f43"
              />
              <text
                x={at.x}
                y={at.y + 23}
                textAnchor="middle"
                fontSize="11"
                fill="#253f43"
              >
                {id}
              </text>
            </g>
          );
        })}
    </g>
  );
}
