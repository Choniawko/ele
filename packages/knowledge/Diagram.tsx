import { useMemo } from "react";
import { catalog, type InternalConnection } from "@catalog/index";
import {
  terminalKey,
  type ProjectDocument,
  type TerminalRef,
  type Conductor,
  type Bridge,
} from "@model/index";
import { DevicePhysical, DeviceSchematic, MM } from "@renderers/index";
import { auxiliaryMechanism, mechanismOwner } from "@simulation/mechanisms";
import type { RuntimeSnapshot } from "@simulation/index";
import {
  documentaryConnectionClosed,
  resolveConnectionState,
} from "@simulation/connections";
import { deviceByName, permanentNets } from "./diagram-model";
import type { DiagramScope, Highlight } from "./types";
import { physicalWirePaths } from "@editor/wire-routing";
import { ElectricalSymbol } from "@renderers/electrical-symbol";
import { routedNet } from "./diagram-routing";
export { ElectricalSymbol } from "@renderers/electrical-symbol";
const ink = "#253f43";
const keyAction = (e: React.KeyboardEvent, action: () => void) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    action();
  }
};
function closed(
  c: InternalConnection,
  p: ProjectDocument,
  rt: RuntimeSnapshot,
  id: string,
  live: boolean,
) {
  const d = p.circuit.devices.find((d) => d.id === id)!;
  return live
    ? resolveConnectionState(p, rt, d, c).displayClosed
    : documentaryConnectionClosed(p, d, c);
}
export function FunctionalDiagram({
  project: p,
  runtime: rt,
  scope,
  live,
  highlight,
  onHighlight,
}: {
  project: ProjectDocument;
  runtime: RuntimeSnapshot;
  scope: DiagramScope;
  live: boolean;
  highlight: Highlight;
  onHighlight: (h: Highlight) => void;
}) {
  const net = useMemo(() => permanentNets(p), [p]);
  const symbols = scope.symbols.map((s) => {
    const d = deviceByName(p, s.designation),
      c = catalog[d.productId].topology.connections.find(
        (c) => c.id === s.fragmentId,
      )!;
    return { ...s, d, c };
  });
  const ports = [
    ...scope.ports.map((pt) => ({
      ...pt,
      ref: {
        deviceId: deviceByName(p, pt.designation).id,
        terminalId: pt.terminalId,
      },
    })),
    ...symbols.flatMap((s) => [
      {
        x: s.x + (s.reverse ? 120 : 0),
        y: s.y,
        ref: { deviceId: s.d.id, terminalId: s.c.from },
      },
      {
        x: s.x + (s.reverse ? 0 : 120),
        y: s.y,
        ref: { deviceId: s.d.id, terminalId: s.c.to },
      },
    ]),
  ];
  const groups = new Map<string, typeof ports>();
  for (const port of ports) {
    const k = net(port.ref);
    groups.set(k, [...(groups.get(k) ?? []), port]);
  }
  const lines = [...groups.entries()].map(([k, pts]) => {
    const anchor = scope.netAnchors?.find(
      (a) =>
        net({
          deviceId: deviceByName(p, a.designation).id,
          terminalId: a.terminalId,
        }) === k,
    );
    const minX = Math.min(...pts.map((pt) => pt.x)),
      maxX = Math.max(...pts.map((pt) => pt.x)),
      minY = Math.min(...pts.map((pt) => pt.y)),
      maxY = Math.max(...pts.map((pt) => pt.y));
    const x =
      anchor?.point.x ??
      (pts.some((pt) => pt.x > scope.width - 180) ? maxX : minX);
    const path =
      minY === maxY
        ? `M${minX} ${minY}H${maxX}`
        : `M${x} ${minY}V${maxY} ${pts.map((pt) => `M${pt.x} ${pt.y}H${x}`).join(" ")}`;
    const routed = anchor?.trunk
      ? routedNet(pts, anchor.trunk)
      : {
          path,
          junctions:
            pts.length > 2 && minY !== maxY
              ? [...new Set(pts.map((pt) => pt.y))].map((y) => ({ x, y }))
              : [],
        };
    return { k, ...routed };
  });
  const selectedNets = new Set(highlight.terminals.map(net));
  return (
    <svg
      className="knowledge-diagram"
      viewBox={`0 0 ${scope.width} ${scope.height}`}
      role="img"
      aria-label={scope.title}
    >
      <title>{scope.title}</title>
      <desc>
        Rysunek funkcjonalny. Kliknij symbol, aby wskazać aparat i parę zacisków
        na tablicy. Tabela poniżej podaje fizyczne żyły. Kropka oznacza węzeł;
        skrzyżowanie z przerwą nie łączy sieci.
      </desc>
      <text x="30" y="38" fill={ink} fontSize="24" fontWeight="600">
        {live
          ? p.faults.some((f) => f.hidden)
            ? "POŁOŻENIE MECHANIZMÓW — ciągłość sprawdź pomiarem"
            : "WIDOK DZIAŁANIA — rzeczywista ciągłość"
          : "WIDOK DOKUMENTACYJNY — stan odniesienia, bez pobudzenia"}
      </text>
      {lines.map((l) => (
        <g key={l.k} data-functional-net={l.k}>
          <path d={l.path} stroke="white" strokeWidth="8" fill="none" />
          <path
            d={l.path}
            stroke={selectedNets.has(l.k) ? "#b05a10" : ink}
            strokeWidth={selectedNets.has(l.k) ? 3 : 2}
            fill="none"
          />
          {l.junctions.map((pt) => (
            <circle
              key={`${pt.x}:${pt.y}`}
              cx={pt.x}
              cy={pt.y}
              r="4"
              fill={ink}
            />
          ))}
        </g>
      ))}
      {scope.ports.map((pt) => (
        <g key={`${pt.designation}:${pt.terminalId}`}>
          <circle cx={pt.x} cy={pt.y} r="4" fill="white" stroke={ink} />
          <text
            x={pt.x}
            y={pt.y - 25}
            textAnchor="middle"
            fontSize="18"
            fill={ink}
          >
            {pt.label}
          </text>
        </g>
      ))}
      {symbols.map((s) => {
        const refs = [s.c.from, s.c.to].map((terminalId) => ({
          deviceId: s.d.id,
          terminalId,
        }));
        const selected =
          highlight.deviceIds.includes(s.d.id) &&
          highlight.terminals.some((r) =>
            refs.some((t) => terminalKey(r) === terminalKey(t)),
          );
        const choose = () =>
          onHighlight({ deviceIds: [s.d.id], terminals: refs });
        const owner = mechanismOwner(p, s.d.id);
        return (
          <g
            key={`${s.designation}:${s.fragmentId}`}
            data-device-id={s.d.id}
            data-symbol-fragment={s.c.id}
            data-closed={closed(s.c, p, rt, s.d.id, live)}
            data-state-view={
              !live
                ? "documentary"
                : p.faults.some((f) => f.hidden)
                  ? "mechanism"
                  : "continuity"
            }
            transform={`translate(${s.x} ${s.y})`}
            role="button"
            tabIndex={0}
            className="knowledge-symbol"
            aria-label={`${s.label} ${s.designation} ${s.c.from}–${s.c.to}`}
            onClick={choose}
            onKeyDown={(e) => keyAction(e, choose)}
          >
            <rect
              x="0"
              y="-50"
              width="120"
              height="104"
              fill={selected ? "#ffefcf" : "white"}
              stroke={selected ? "#b05a10" : "none"}
              rx="5"
            />
            <text
              x="60"
              y="-29"
              textAnchor="middle"
              fontSize="20"
              fontWeight="600"
              fill={ink}
            >
              {s.designation} · {s.label}
            </text>
            <g transform={s.reverse ? "translate(120) scale(-1,1)" : undefined}>
              <ElectricalSymbol
                connection={s.c}
                winding={catalog[s.d.productId].behaviorId === "motor"}
                isClosed={closed(s.c, p, rt, s.d.id, live)}
                active={
                  live &&
                  (s.c.kind === "coil"
                    ? rt.devices[s.d.id].coil
                    : rt.devices[s.d.id].powered)
                }
              />
            </g>
            <text x="0" y="24" fontSize="17" fill={ink}>
              {s.reverse ? s.c.to : s.c.from}
            </text>
            <text x="120" y="24" textAnchor="end" fontSize="17" fill={ink}>
              {s.reverse ? s.c.from : s.c.to}
            </text>
            {owner && (
              <text x="60" y="43" textAnchor="middle" fontSize="16" fill={ink}>
                mechanizm{" "}
                {p.circuit.devices.find((d) => d.id === owner)?.designation}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
export function PhysicalDiagram({
  project: p,
  runtime: rt,
  highlight,
  onHighlight,
}: {
  project: ProjectDocument;
  runtime: RuntimeSnapshot;
  highlight: Highlight;
  onHighlight: (h: Highlight) => void;
}) {
  const routes = useMemo(() => physicalWirePaths(p), [p]);
  const bounds = {
    width: Math.max(
      1100,
      ...Object.values(p.physical.devices).map((pt) => pt.x + 280),
    ),
    height: Math.max(
      720,
      ...Object.values(p.physical.devices).map((pt) => pt.y + 270),
    ),
  };
  const point = (r: TerminalRef) => {
    const d = p.circuit.devices.find((d) => d.id === r.deviceId)!,
      t = catalog[d.productId].topology.terminals.find(
        (t) => t.id === r.terminalId,
      )!,
      at = p.physical.devices[d.id];
    return { x: at.x + t.x * MM, y: at.y + t.y * MM };
  };
  return (
    <svg
      className="knowledge-diagram physical"
      viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      role="img"
      aria-label="Tablica fizyczna przykładu"
    >
      <title>Tablica fizyczna — profile i zaciski z katalogu</title>
      {p.physical.enclosures?.map((e) => (
        <g key={e.id}>
          <rect
            x={e.position.x}
            y={e.position.y}
            width={e.width}
            height={e.height}
            fill="#f3f5f2"
            stroke="#73887f"
            strokeDasharray="6 3"
          />
          <text
            x={e.position.x + 6}
            y={e.position.y - 8}
            fill={ink}
            fontSize="20"
          >
            {e.name} · podgląd połączeń
          </text>
        </g>
      ))}
      {p.physical.rails?.map((r) => (
        <rect
          key={r.id}
          x={r.x}
          y={r.y}
          width={r.width}
          height="20"
          fill="#dce3e0"
        />
      ))}
      {(
        [...p.circuit.conductors, ...p.circuit.bridges] as (
          Conductor | Bridge
        )[]
      ).map((w, i) => {
        const a = point(w.from),
          b = point(w.to),
          selected = w.id === highlight.wireId;
        const y = Math.min(a.y, b.y) - 25 - (i % 7) * 8;
        return (
          <path
            key={w.id}
            d={
              routes[w.id]?.length
                ? routes[w.id]
                    .map((pt, i) => `${i ? "L" : "M"}${pt.x} ${pt.y}`)
                    .join(" ")
                : `M${a.x} ${a.y}V${y}H${b.x}V${b.y}`
            }
            fill="none"
            stroke={
              selected
                ? "#b05a10"
                : "insulationColor" in w
                  ? w.insulationColor
                  : ink
            }
            opacity={selected ? 1 : 0.55}
            strokeWidth={selected ? 5 : 2}
            onClick={() =>
              onHighlight({
                wireId: w.id,
                deviceIds: [w.from.deviceId, w.to.deviceId],
                terminals: [w.from, w.to],
              })
            }
          />
        );
      })}
      {p.circuit.devices.map((d) => (
        <g
          key={d.id}
          transform={`translate(${p.physical.devices[d.id].x} ${p.physical.devices[d.id].y})`}
        >
          <DevicePhysical
            product={catalog[d.productId]}
            device={d}
            state={
              catalog[d.productId].behaviorId === "auxiliary"
                ? {
                    ...rt.devices[d.id],
                    mechanism: auxiliaryMechanism(p, rt, d.id),
                  }
                : rt.devices[d.id]
            }
            selected={highlight.deviceIds.includes(d.id)}
            highlighted={highlight.terminals.map(terminalKey)}
            onSelect={() => onHighlight({ deviceIds: [d.id], terminals: [] })}
            onTerminal={(ref) =>
              onHighlight({ deviceIds: [d.id], terminals: [ref] })
            }
          />
        </g>
      ))}
    </svg>
  );
}
export function ProductIllustration({ productId }: { productId: string }) {
  const product = catalog[productId],
    device = {
      id: "illustration",
      productId,
      productRevision: product.revision,
      designation: "Aparat",
      settings: product.defaults,
    };
  return (
    <div className="knowledge-product-illustration">
      <figure>
        <svg
          viewBox={`-20 -30 ${(product.dimensions.value!.width + 20) * MM} ${(product.dimensions.value!.height + 30) * MM}`}
          role="img"
          aria-label={`Wygląd ${product.displayNamePl}`}
        >
          <DevicePhysical
            product={product}
            device={device}
            showTerminals={false}
          />
        </svg>
        <figcaption>
          {product.displayNamePl} ·{" "}
          {product.educational ? "profil dydaktyczny" : "produkt katalogowy"}
        </figcaption>
      </figure>
      <figure>
        <svg
          viewBox="-10 -20 180 430"
          role="img"
          aria-label="Symbole aparatu w stanie odniesienia"
        >
          <DeviceSchematic
            product={product}
            device={device}
            showTerminals={false}
          />
        </svg>
        <figcaption>Stan odniesienia; symbole funkcjonalne modelu.</figcaption>
      </figure>
    </div>
  );
}
