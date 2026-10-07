import {
  distributionRails,
  enclosureWindows,
  rowOccupancy,
  distributionProfile,
} from "@model/distribution";
import { catalog } from "@catalog/index";
import { mountingInfo } from "@catalog/mounting-profiles";
import type {
  PhysicalEnclosure as Enclosure,
  PhysicalTrunk,
} from "@model/index";
import { useApp } from "@/store";
export function EnclosureBody({
  enclosure: e,
  selected,
}: {
  enclosure: Enclosure;
  selected: boolean;
}) {
  const project = useApp((s) => s.project);
  const rails = e.distribution ? distributionRails(e) : project.physical.rails;
  return (
    <g data-enclosure={e.name} data-closed={String(e.closed)}>
      <rect
        width={e.width}
        height={e.height}
        rx={e.kind === "distribution" ? 12 : 9}
        fill={e.closed ? "#f3f2eb" : "#dee2d8"}
        stroke={selected ? "#2b8064" : "#a7b1a1"}
        strokeWidth={selected ? 3 : 2}
      />
      <rect
        x={6}
        y={6}
        width={e.width - 12}
        height={e.height - 12}
        rx={7}
        fill="none"
        stroke="#fff"
        strokeWidth={3}
      />
      {!e.closed &&
        rails
          ?.filter(
            (r) =>
              r.x >= e.position.x &&
              r.x + r.width <= e.position.x + e.width &&
              r.y >= e.position.y &&
              r.y <= e.position.y + e.height,
          )
          .map((r) => (
            <g key={r.id}>
              <rect
                x={r.x - e.position.x}
                y={r.y - e.position.y}
                width={r.width}
                height={77}
                fill="#bac4b5"
                stroke="#99a791"
              />
              <rect
                x={r.x - e.position.x}
                y={r.y - e.position.y + 9}
                width={r.width}
                height={59}
                fill="#d4dbcf"
              />
              <path
                d={`M${r.x - e.position.x} ${r.y - e.position.y + 4}h${r.width}M${r.x - e.position.x} ${r.y - e.position.y + 73}h${r.width}`}
                stroke="#f4f7eb"
                strokeWidth={3}
              />
            </g>
          ))}
      {e.closed &&
        enclosureWindows(e).map((w, row) => (
          <g key={row}>
            <rect
              x={w.x - 5}
              y={w.y - 5}
              width={w.width + 10}
              height={w.height + 10}
              rx={4}
              fill={e.distribution ? "#efeee7" : "#b9c4b4"}
              stroke="#d1d8cb"
              strokeWidth={2}
            />
            {e.distribution &&
              Array.from(
                { length: e.distribution.modulesPerRow },
                (_, slot) => slot,
              )
                .filter(
                  (slot) =>
                    !rowOccupancy(project, e, "modules", row, (id) =>
                      mountingInfo(catalog[id]),
                    ).has(slot),
                )
                .map((slot) => (
                  <rect
                    key={slot}
                    data-blank-slot={`${row}:${slot}`}
                    x={
                      w.x +
                      slot *
                        distributionProfile.moduleMm *
                        distributionProfile.scale +
                      1
                    }
                    y={w.y + 1}
                    width={
                      distributionProfile.moduleMm * distributionProfile.scale -
                      2
                    }
                    height={w.height - 2}
                    fill="#efeee7"
                    stroke="#d1d8cb"
                  />
                ))}
          </g>
        ))}
      {!e.closed && e.distribution && (
        <text x={40} y={e.height - 20} fontSize={12} fill="#52684d">
          PRZYŁĄCZENIA N / PE / L · bez domyślnych mostków
        </text>
      )}
      {e.closed && e.kind !== "distribution" && (
        <>
          <rect
            x={14}
            y={14}
            width={e.width - 28}
            height={e.height - 28}
            rx={5}
            fill="none"
            stroke="#dde2d6"
          />
          <circle cx={e.width / 2} cy={e.height / 2} r={4} fill="#a9b49f" />
        </>
      )}
    </g>
  );
}
export function TrunkBody({ trunk: t }: { trunk: PhysicalTrunk }) {
  const d = t.points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return (
    <g data-trunk={t.name} data-closed={String(t.closed)}>
      <path
        d={d}
        fill="none"
        stroke="#aeb7a3"
        strokeWidth={t.width + 3}
        strokeLinejoin="miter"
      />
      <path
        d={d}
        fill="none"
        stroke={t.closed ? "#f0efe5" : "#ced5c2"}
        strokeWidth={t.width}
        strokeLinejoin="miter"
      />
      <path
        d={d}
        fill="none"
        stroke={t.closed ? "#faf9f1" : "#bcc7b0"}
        strokeWidth={t.closed ? t.width - 7 : 1}
        strokeLinejoin="miter"
      />
      <title>
        {t.name} · {t.conductorIds.length} żył ·{" "}
        {t.closed ? "pokrywa zamknięta" : "pokrywa otwarta"}
      </title>
    </g>
  );
}

export const ENCLOSURE_HEADER_OFFSET = 28;
export function EnclosureHandle({ enclosure: e }: { enclosure: Enclosure }) {
  return (
    <g
      data-enclosure-handle={e.name}
      role="button"
      tabIndex={0}
      aria-label={`Przenieś obudowę ${e.name}`}
      onKeyDown={(event) => {
        const delta = {
          ArrowLeft: [-10, 0],
          ArrowRight: [10, 0],
          ArrowUp: [0, -10],
          ArrowDown: [0, 10],
        }[event.key];
        if (delta) {
          event.preventDefault();
          useApp.getState().moveEnclosure(e.id, {
            x: e.position.x + delta[0],
            y: e.position.y + delta[1],
          });
        }
      }}
      style={{ cursor: "move" }}
    >
      <title>
        Przeciągnij obudowę z zawartością; strzałki przesuwają o 10 jednostek
      </title>
      <rect width={e.width} height={24} fill="transparent" />
      <text
        x={e.width / 2}
        y={16}
        textAnchor="middle"
        fontSize={15}
        fontWeight={600}
        fill="#314d43"
      >
        {e.name}
      </text>
    </g>
  );
}

export function EnclosureCover({ enclosure: e }: { enclosure: Enclosure }) {
  return (
    <g
      className="device-control"
      role="button"
      tabIndex={0}
      aria-label={
        e.distribution
          ? `${e.closed ? "Zdejmij" : "Załóż"} maskownicę ${e.name}`
          : `${e.closed ? "Otwórz" : "Zamknij"} pokrywę ${e.name}`
      }
      onPointerDown={(ev) => ev.stopPropagation()}
      onClick={(ev) => {
        ev.stopPropagation();
        useApp.getState().toggleEnclosure(e.id);
      }}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          useApp.getState().toggleEnclosure(e.id);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={0}
        y={0}
        width={e.width - 24}
        height={20}
        rx={3}
        fill="#e8ece0"
      />
      <text
        x={(e.width - 24) / 2}
        y={14}
        textAnchor="middle"
        fontSize={11}
        fill="#52684d"
      >
        {e.distribution
          ? e.closed
            ? "ZDEJMIJ MASKOWNICĘ"
            : "ZAŁÓŻ MASKOWNICĘ"
          : e.closed
            ? "OTWÓRZ"
            : "ZAMKNIJ"}
      </text>
    </g>
  );
}
