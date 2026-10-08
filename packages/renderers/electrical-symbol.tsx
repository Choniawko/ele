import type { InternalConnection } from "@catalog/index";
const ink = "#253f43";
export function ElectricalSymbol({
  connection: c,
  isClosed = false,
  active = false,
  winding = false,
}: {
  connection: InternalConnection;
  isClosed?: boolean;
  active?: boolean;
  winding?: boolean;
}) {
  const nc = [
    "manual-inverse",
    "mechanism-inverse",
    "stop-inverse",
    "healthy",
  ].includes(c.condition ?? "");
  return (
    <g stroke={ink} strokeWidth="2" fill="none">
      <path d="M0 0H38 M82 0H120" />
      {c.kind === "contact" ? (
        <>
          <circle cx="40" cy="0" r="3" fill="white" />
          <circle cx="80" cy="0" r="3" fill="white" />
          <path d={`M40 0L80 ${isClosed ? 0 : -20}`} />
          {nc && <path d="M71 -9V9" />}
        </>
      ) : c.kind === "coil" ? (
        <rect
          x="38"
          y="-15"
          width="44"
          height="30"
          fill={active ? "#d5eee4" : "white"}
        />
      ) : c.kind === "load" && winding ? (
        <>
          <rect
            x="38"
            y="-15"
            width="44"
            height="30"
            fill={active ? "#d5eee4" : "white"}
          />
          <path d="M43 -7Q48 -15 53 -7T63 -7T73 -7M43 7Q48 15 53 7T63 7T73 7" />
        </>
      ) : c.kind === "load" ? (
        <>
          <circle cx="60" cy="0" r="21" fill={active ? "#fff1b8" : "white"} />
          <path d="M45 -15L75 15M45 15L75 -15" />
        </>
      ) : c.kind === "bridge" ? (
        <path d="M38 0H82" />
      ) : (
        <>
          <rect x="38" y="-18" width="44" height="36" fill="white" />
          <text
            x="60"
            y="5"
            textAnchor="middle"
            stroke="none"
            fill={ink}
            fontSize="18"
          >
            {c.kind === "electronics" ? "E" : "Z"}
          </text>
        </>
      )}
    </g>
  );
}
