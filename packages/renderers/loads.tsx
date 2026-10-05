import { useId } from "react";
import type { VisualId } from "@catalog/index";
import type { DeviceInstance } from "@model/index";
import type { DeviceRuntime } from "@simulation/index";

function Rotor({
  radius,
  on,
  reverse,
}: {
  radius: number;
  on: boolean;
  reverse: boolean;
}) {
  return (
    <g
      className={`motor-rotor${on ? " running" : ""}${reverse ? " reverse" : ""}`}
      data-rotor={on ? "running" : "stopped"}
    >
      <g transform={`scale(${radius / 28})`}>
        {[0, 120, 240].map((angle) => (
          <path
            key={angle}
            d="M-3 2C-11-1-25-13-20-21C-15-29 1-27 5-20C9-13 4-5 2 0Z"
            transform={`rotate(${angle})`}
            fill="#8aabb2"
            stroke="#4b6b73"
            strokeWidth={0.7}
          />
        ))}
        <path
          d="M-19-17Q-17-22-10-23"
          fill="none"
          stroke="#e6b552"
          strokeWidth={2}
        />
      </g>
    </g>
  );
}

export function LoadVisual({
  visualId,
  device: d,
  state: s,
  on,
  width: w,
}: {
  visualId: VisualId;
  device: DeviceInstance;
  state?: DeviceRuntime;
  on: boolean;
  width: number;
}) {
  const id = useId().replace(/:/g, ""),
    light = `${id}-light`,
    glass = `${id}-glass`,
    warmth = `${id}-warmth`,
    metal = `${id}-metal`;
  return (
    <g className="load-visual" pointerEvents="none">
      <defs>
        <radialGradient id={light}>
          <stop stopColor="#fff5ad" stopOpacity={0.9} />
          <stop offset="0.5" stopColor="#ffd45a" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ffbe35" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={glass} cx="40%" cy="35%">
          <stop stopColor={on ? "#fffff3" : "#f1f3ee"} />
          <stop offset="0.65" stopColor={on ? "#fff4b0" : "#dce2db"} />
          <stop offset="1" stopColor={on ? "#ffc946" : "#b4bfb4"} />
        </radialGradient>
        <radialGradient id={warmth}>
          <stop stopColor="#ff9d37" stopOpacity={0.7} />
          <stop offset="1" stopColor="#f15a24" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={metal} x2="0" y2="1">
          <stop stopColor="#eef2ed" />
          <stop offset="0.5" stopColor="#9fafa8" />
          <stop offset="1" stopColor="#d8e1da" />
        </linearGradient>
      </defs>
      {visualId === "lamp" && (
        <>
          {on && (
            <ellipse
              className="lamp-light"
              data-light="emitting"
              cx={w / 2}
              cy={32}
              rx={w / 2 + 12}
              ry={48}
              fill={`url(#${light})`}
            />
          )}
          <circle
            cx={w / 2}
            cy={32}
            r={26}
            fill="#e8ebe4"
            stroke="#b4beb2"
            strokeWidth={0.7}
          />
          <circle cx={w / 2} cy={32} r={23} fill="#a7b3a6" />
          <circle
            className={`lamp-glass${on ? " lit" : ""}`}
            cx={w / 2}
            cy={32}
            r={21}
            fill={`url(#${glass})`}
            stroke={on ? "#ffdc7a" : "#b9c4b6"}
            strokeWidth={0.5}
          />
          {on && (
            <g
              stroke="#ecb33c"
              strokeWidth={0.8}
              strokeLinecap="round"
              opacity={0.8}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <path
                  key={angle}
                  d={`M${w / 2} 1v-5`}
                  transform={`rotate(${angle} ${w / 2} 32)`}
                />
              ))}
            </g>
          )}
          <path
            d={`M${w / 2 - 8} 27q8-5 16 0M${w / 2 - 6} 27l3 12h6l3-12`}
            fill="none"
            stroke={on ? "#fffdf0" : "#81917f"}
            strokeWidth={1.3}
          />
          <path
            d={`M${w / 2 - 4} 39v5m8-5v5`}
            stroke={on ? "#dfac36" : "#849480"}
            strokeWidth={0.8}
          />
          <text
            x={w / 2}
            y={64}
            fontSize={3.8}
            textAnchor="middle"
            fill="#667260"
          >
            {d.settings.powerW ?? 60} W · {d.settings.voltageV ?? 230} V
          </text>
        </>
      )}
      {visualId === "heater" && (
        <>
          <rect
            x={6}
            y={12}
            width={w - 12}
            height={44}
            rx={3}
            fill="#c6cfc6"
            stroke="#a2b1a2"
            strokeWidth={0.7}
          />
          <rect
            x={10}
            y={16}
            width={w - 20}
            height={36}
            rx={2}
            fill="#485650"
          />
          {on && (
            <ellipse
              data-heat="emitting"
              cx={w / 2}
              cy={31}
              rx={w / 2 + 3}
              ry={36}
              fill={`url(#${warmth})`}
            />
          )}
          <path
            className={on ? "heater-active" : ""}
            d={`M16 22h${w - 32}q4 0 4 5t-4 5H16q-4 0-4 5t4 5h${w - 32}`}
            fill="none"
            stroke={on ? "#ff7434" : "#96a296"}
            strokeWidth={3.6}
            strokeLinecap="round"
          />
          {on && (
            <>
              <path
                d={`M16 22h${w - 32}q4 0 4 5t-4 5H16q-4 0-4 5t4 5h${w - 32}`}
                fill="none"
                stroke="#ffda8d"
                strokeWidth={1}
              />
              <g
                className="heat-plume"
                stroke="#e19857"
                strokeWidth={0.9}
                fill="none"
                opacity={0.6}
              >
                {[w / 2 - 15, w / 2, w / 2 + 15].map((x) => (
                  <path key={x} d={`M${x} 15q-4-4 0-8t0-8`} />
                ))}
              </g>
            </>
          )}
          <text
            x={w / 2}
            y={64}
            fontSize={3.8}
            textAnchor="middle"
            fill="#546654"
          >
            {d.settings.powerW ?? 2300} W · rezystancyjna
          </text>
        </>
      )}
      {visualId === "fan" && (
        <>
          <rect
            x={10}
            y={5}
            width={w - 20}
            height={60}
            rx={5}
            fill={`url(#${metal})`}
            stroke="#9eafa5"
            strokeWidth={0.7}
          />
          <circle
            cx={w / 2}
            cy={34}
            r={28}
            fill="#344d51"
            stroke="#8dabae"
            strokeWidth={1.6}
          />
          <g transform={`translate(${w / 2} 34)`}>
            <Rotor radius={25} on={on} reverse={false} />
          </g>
          <g fill="none" stroke="#bdcac6" strokeWidth={0.45} opacity={0.65}>
            {[12, 20, 26].map((r) => (
              <circle key={r} cx={w / 2} cy={34} r={r} />
            ))}
            {[0, 45, 90, 135].map((angle) => (
              <path
                key={angle}
                d={`M${w / 2 - 27} 34h54`}
                transform={`rotate(${angle} ${w / 2} 34)`}
              />
            ))}
          </g>
          <circle
            data-rotor-hub="fan"
            cx={w / 2}
            cy={34}
            r={4.5}
            fill={`url(#${metal})`}
            stroke="#5c7e81"
            strokeWidth={0.7}
          />
          {on && (
            <g
              className="fan-airflow"
              data-airflow="moving"
              stroke="#6e9aa2"
              strokeWidth={1}
              fill="none"
              strokeLinecap="round"
            >
              {[19, 31, 43].map((y) => (
                <path key={y} d={`M${w - 12} ${y}q8-4 10 0t8 0`} />
              ))}
            </g>
          )}
          <text
            x={w / 2}
            y={64}
            fontSize={3.5}
            textAnchor="middle"
            fill="#536b64"
          >
            {d.settings.powerW ?? 80} W · {d.settings.voltageV ?? 230} V
          </text>
        </>
      )}
      {visualId === "motor" && (
        <>
          <rect
            x={10}
            y={17}
            width={w - 20}
            height={48}
            rx={10}
            fill="#738479"
            stroke="#475e51"
            strokeWidth={0.9}
          />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M${22 + i * 9} 21v40`}
              stroke="#495e50"
              strokeWidth={1.3}
            />
          ))}
          <circle
            cx={w / 2}
            cy={41}
            r={22}
            fill={`url(#${metal})`}
            stroke="#718778"
            strokeWidth={1}
          />
          <circle cx={w / 2} cy={41} r={19.5} fill="#344d51" />
          <g transform={`translate(${w / 2} 41)`}>
            <Rotor radius={18} on={on} reverse={s?.direction === "132"} />
          </g>
          <circle
            data-rotor-hub="motor"
            cx={w / 2}
            cy={41}
            r={3.5}
            fill={`url(#${metal})`}
            stroke="#6e856f"
          />
          <text
            x={w / 2}
            y={74}
            textAnchor="middle"
            fontSize={4}
            fill="#536b4a"
          >
            {s?.windingConnection
              ? `${s.windingConnection === "star" ? "Y" : s.windingConnection === "delta" ? "Δ" : "Brak mostków"} · `
              : "3~ "}{" "}
            {on
              ? `${s?.direction === "132" ? "↺" : "↻"} ${s?.direction ?? ""}`
              : s?.motorSupply === "voltage-mismatch"
                ? "Błędne napięcie"
                : s?.motorSupply === "phase-loss"
                  ? "Brak faz"
                  : "OFF"}
          </text>
        </>
      )}
    </g>
  );
}
