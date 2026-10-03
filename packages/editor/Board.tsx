import { memo, useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  GraphProvider,
  Paper,
  linkRoutingOrthogonal,
  type ElementPort,
  type ElementRecord,
  type LinkRecord,
  useLinkLayout,
} from "@joint/react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Hand,
  MousePointer2,
  Plus,
  Move,
  Route,
  RotateCcw,
  X,
} from "lucide-react";
import { useApp } from "@/store";
import { mountingRails, nearestRail } from "./layout";
import { physicalWireRouters } from "./wire-routing";
import { catalog } from "@catalog/index";
import { terminalKey, type Point, type DeviceInstance } from "@model/index";
import {
  DevicePhysical,
  DeviceSchematic,
  MM,
  schematicGeometry,
  type DeviceProps,
} from "@renderers/index";
import type { DeviceRuntime } from "@simulation/index";
import "@joint/react/styles.css";
import type { dia } from "@joint/core";
interface ElementData {
  device: DeviceInstance;
  state?: DeviceRuntime;
  view: "physical" | "schematic";
  selected: boolean;
  showTerminals: boolean;
  zoom: number;
  red?: string;
  black?: string;
  wireStart?: string;
  highlighted?: string[];
}
const onTerminal: DeviceProps["onTerminal"] = (ref) => {
  useApp.getState().select(ref.deviceId);
  useApp.getState().terminalClick(ref);
};
interface WireData {
  protective: boolean;
  color: string;
  selected: boolean;
  dimmed: boolean;
  description: string;
  wireId: string;
}
function WireOverlay({
  protective,
  color,
  selected,
  dimmed,
  description,
  wireId,
}: WireData) {
  const layout = useLinkLayout();
  if (!layout) return null;
  return (
    <g
      className="wire-overlay"
      data-wire={wireId}
      opacity={dimmed ? 0.24 : 1}
      pointerEvents="none"
    >
      <title>{description}</title>
      <path
        d={layout.d}
        fill="none"
        stroke="#f1f3e9"
        strokeWidth={selected ? 9 : 7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={layout.d}
        fill="none"
        stroke={selected ? "#d18a28" : color}
        strokeWidth={selected ? 4.5 : 3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {protective && !selected && (
        <path
          d={layout.d}
          fill="none"
          stroke="#f4d44c"
          strokeWidth={3.2}
          strokeDasharray="8 8"
        />
      )}
      {selected &&
        [
          { x: layout.sourceX, y: layout.sourceY },
          { x: layout.targetX, y: layout.targetY },
        ].map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={5}
            fill="#fff4d3"
            stroke="#d18a28"
            strokeWidth={2}
          />
        ))}
    </g>
  );
}
function BoardDevice(data: ElementData) {
  const props: DeviceProps = {
    ...data,
    product: catalog[data.device.productId],
    onTerminal,
    onOperate: (state) => useApp.getState().operate(data.device.id, state),
    onRcdTest: () => useApp.getState().testRcd(data.device.id),
  };
  return data.view === "physical" ? (
    <DevicePhysical {...props} />
  ) : (
    <DeviceSchematic {...props} />
  );
}
function BoardView({ view }: { view: "physical" | "schematic" }) {
  const project = useApp((s) => s.project),
    runtimeDevices = useApp((s) => s.runtime.devices),
    selection = useApp((s) => s.selection),
    wireStart = useApp((s) => s.wireStart),
    showTerminals = useApp((s) => s.showTerminals),
    instrument = useApp((s) => s.instrument),
    adding = useApp((s) => s.adding),
    waypoints = useApp((s) => s.waypoints);
  const host = useRef<HTMLDivElement>(null),
    drag = useRef<{ at: Point; pan: Point } | null>(null),
    deviceDrag = useRef<Record<string, Point> | null>(null),
    previousSize = useRef<{ width: number; height: number } | null>(null),
    panMoved = useRef(false);
  const [transform, setTransform] = useState({ scale: 0.7, x: 0, y: 0 }),
    [panMode, setPanMode] = useState(false),
    [cursor, setCursor] = useState<Point | null>(null),
    [routeEditing, setRouteEditing] = useState(false),
    [mountingPreview, setMountingPreview] = useState<Point | null>(null);
  const rails = useMemo(() => mountingRails(project), [project]);
  const wireRouters = useMemo(
    () =>
      physicalWireRouters(project.circuit.devices, project.circuit.conductors),
    [project.circuit.devices, project.circuit.conductors],
  );
  const selectedWire = project.circuit.conductors.find((w) =>
    selection.includes(w.id),
  );
  const selectedDevices = project.circuit.devices.filter((d) =>
    selection.includes(d.id),
  );
  const movable = !panMode && !wireStart && !adding && !routeEditing;
  useEffect(() => {
    setRouteEditing(false);
  }, [selection[0], view]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest("input,textarea,select,dialog")
      )
        return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Escape") {
        setRouteEditing(false);
        setPanMode(false);
      }
      if (event.key.toLowerCase() === "v") setPanMode(false);
      if (event.key.toLowerCase() === "h") setPanMode(true);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const fit = useCallback(
    (readable = false) => {
      const size = host.current?.getBoundingClientRect();
      if (!size) return;
      const currentProject = useApp.getState().project;
      const ps = Object.values(currentProject[view].devices);
      const width = Math.max(
          view === "physical" ? 1100 : 1140,
          ...ps.map((p) => p.x + 260),
        ),
        height = Math.max(
          view === "physical"
            ? Math.max(
                670,
                ...mountingRails(currentProject).map((rail) => rail.y + 205),
              )
            : 720,
          ...ps.map((p) => p.y + 250),
        );
      const scale = Math.min(
        1.1,
        (size.width - 70) / width,
        (size.height - 70) / height,
      );
      if (readable && (size.width < 680 || size.height < 320)) {
        const first = ps[0] ?? { x: 80, y: 90 };
        const shortViewport = size.height < 320;
        const workingScale = Math.max(shortViewport ? 0.5 : 0.65, scale);
        setTransform({
          scale: workingScale,
          x: 30 - first.x * workingScale,
          y: (shortViewport ? 45 : 90) - first.y * workingScale,
        });
      } else
        setTransform({
          scale,
          x: (size.width - width * scale) / 2,
          y: (size.height - height * scale) / 2,
        });
    },
    [project.circuit.projectId, view],
  );
  useEffect(() => {
    previousSize.current = null;
    const observer = new ResizeObserver(() => {
      const size = host.current?.getBoundingClientRect();
      if (!size) return;
      const old = previousSize.current;
      if (old)
        setTransform((t) => ({
          ...t,
          x: t.x + (size.width - old.width) / 2,
          y: t.y + (size.height - old.height) / 2,
        }));
      else fit(true);
      previousSize.current = { width: size.width, height: size.height };
    });
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [fit]);
  useEffect(() => fit(true), [fit, rails.length]);
  const cells = useMemo(() => {
    const elements: ElementRecord[] = project.circuit.devices.map((d) => {
      const p = catalog[d.productId],
        dim = p.dimensions.value!,
        geo = schematicGeometry(p);
      const ports: Record<string, ElementPort> = Object.fromEntries(
        p.topology.terminals.map((t) => {
          const pt =
            view === "physical"
              ? { x: t.x * MM, y: t.y * MM }
              : geo.ports[t.id];
          return [
            t.id,
            {
              cx: pt.x,
              cy: pt.y,
              width: 1,
              height: 1,
              color: "transparent",
              outline: "transparent",
              className: "app-port",
              passive: true,
            },
          ];
        }),
      );
      return {
        id: d.id,
        type: "element",
        position: project[view].devices[d.id],
        size:
          view === "physical"
            ? { width: dim.width * MM, height: dim.height * MM }
            : { width: geo.width, height: geo.height },
        portMap: ports,
        z: 2,
        data: {
          device: d,
          state: runtimeDevices[d.id],
          view,
          selected: selection.includes(d.id),
          showTerminals,
          zoom: transform.scale,
          red: instrument.red ? terminalKey(instrument.red) : undefined,
          black: instrument.black ? terminalKey(instrument.black) : undefined,
          wireStart: wireStart ? terminalKey(wireStart) : undefined,
          highlighted: selectedWire
            ? [terminalKey(selectedWire.from), terminalKey(selectedWire.to)]
            : [],
        },
      };
    });
    const wires: LinkRecord[] = project.circuit.conductors.map((w) => ({
      id: w.id,
      type: "link",
      source: {
        id: w.from.deviceId,
        port: w.from.terminalId,
        ...(view === "physical" ? { anchor: { name: "center" } } : {}),
      },
      target: {
        id: w.to.deviceId,
        port: w.to.terminalId,
        ...(view === "physical" ? { anchor: { name: "center" } } : {}),
      },
      vertices: project[view].routes[w.id] ?? [],
      router: view === "physical" ? wireRouters.get(w.id) : undefined,
      z: selection.includes(w.id) ? 4 : 1,
      style: {
        color: "transparent",
        width: selection.includes(w.id) ? 5 : 3.2,
        targetMarker: "none",
        sourceMarker: "none",
      },
      attrs: {
        line: { strokeDasharray: undefined },
      },
      data: {
        protective: w.declaredRole === "PE",
        color: w.insulationColor,
        selected: selection.includes(w.id),
        dimmed: !!selectedWire && selectedWire.id !== w.id,
        description: `${w.marking} · ${project.circuit.devices.find((d) => d.id === w.from.deviceId)!.designation}:${w.from.terminalId} → ${project.circuit.devices.find((d) => d.id === w.to.deviceId)!.designation}:${w.to.terminalId}`,
        wireId: w.id,
      },
      labelMap: selection.includes(w.id)
        ? {
            marking: {
              text: `${w.marking} · ${w.crossSectionMm2} mm²`,
              fontSize: 11,
              color: "#485e46",
              backgroundColor: "#f8faf0",
            },
          }
        : undefined,
    }));
    return [...wires, ...elements];
  }, [
    project,
    runtimeDevices,
    selection,
    view,
    showTerminals,
    instrument.red,
    instrument.black,
    wireStart,
    transform.scale,
    selectedWire,
    wireRouters,
  ]);
  const zoom = (factor: number, point?: Point) =>
    setTransform((t) => {
      const r = host.current?.getBoundingClientRect();
      const x = point?.x ?? (r?.width ?? 700) / 2,
        y = point?.y ?? (r?.height ?? 600) / 2,
        next = Math.min(2.5, Math.max(0.12, t.scale * factor));
      return {
        scale: next,
        x: x - ((x - t.x) * next) / t.scale,
        y: y - ((y - t.y) * next) / t.scale,
      };
    });
  const modelPoint = (ref: NonNullable<typeof wireStart>): Point | null => {
    const d = project.circuit.devices.find((d) => d.id === ref.deviceId);
    if (!d) return null;
    const p = catalog[d.productId],
      position = project[view].devices[d.id],
      t = p.topology.terminals.find((t) => t.id === ref.terminalId)!;
    const pos =
      view === "physical"
        ? { x: t.x * MM, y: t.y * MM }
        : schematicGeometry(p).ports[t.id];
    return { x: position.x + pos.x, y: position.y + pos.y };
  };
  const beginning = wireStart ? modelPoint(wireStart) : null;
  const preview =
    beginning && cursor ? [beginning, ...waypoints, cursor] : null;
  const transformString = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
  return (
    <div
      className={`board-host ${view} ${adding ? "placing" : ""} ${panMode ? "panning" : ""}`}
      ref={host}
      data-testid={`board-${view}`}
      onPointerDownCapture={(event) => {
        const target = event.target as Element;
        if (
          target.closest(
            "button,select,.selection-tools,.canvas-tools,.board-actions,.route-handles",
          )
        )
          return;
        panMoved.current = false;
        if (
          panMode ||
          event.button === 1 ||
          (!target.closest(".joint-element,.joint-link") &&
            !adding &&
            !wireStart &&
            !routeEditing)
        ) {
          drag.current = {
            at: { x: event.clientX, y: event.clientY },
            pan: { x: transform.x, y: transform.y },
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      }}
      onWheel={(e) => {
        e.preventDefault();
        const rect = host.current!.getBoundingClientRect();
        zoom(e.deltaY > 0 ? 0.92 : 1.08, {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
      onPointerMove={(e) => {
        const rect = host.current!.getBoundingClientRect();
        if (wireStart || adding)
          setCursor({
            x: (e.clientX - rect.left - transform.x) / transform.scale,
            y: (e.clientY - rect.top - transform.y) / transform.scale,
          });
        const pan = drag.current;
        if (pan) {
          const delta = { x: e.clientX - pan.at.x, y: e.clientY - pan.at.y };
          if (Math.hypot(delta.x, delta.y) > 4) panMoved.current = true;
          setTransform((t) => ({
            ...t,
            x: pan.pan.x + delta.x,
            y: pan.pan.y + delta.y,
          }));
        }
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        drag.current = null;
        deviceDrag.current = null;
        setMountingPreview(null);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("application/ele-product");
        if (catalog[id]) {
          const rect = host.current!.getBoundingClientRect();
          useApp.getState().addDevice(
            id,
            {
              x: (e.clientX - rect.left - transform.x) / transform.scale,
              y: (e.clientY - rect.top - transform.y) / transform.scale,
            },
            view,
          );
        }
      }}
    >
      <svg className="board-background" aria-hidden="true">
        <g style={{ transform: transformString, transformOrigin: "0 0" }}>
          {view === "physical" ? (
            <>
              <rect
                x={25}
                y={40}
                width={1040}
                height={Math.max(
                  Math.max(630, ...rails.map((rail) => rail.y + 195)),
                  ...Object.values(project.physical.devices).map(
                    (p) => p.y + 250,
                  ),
                )}
                rx={9}
                fill="#e9eae2"
                stroke="#d8ddd0"
              />
              {[50, 1040].flatMap((x) =>
                [65, 625].map((y) => (
                  <g key={`${x}-${y}`}>
                    <circle cx={x} cy={y} r={6} fill="#c7cfbf" />
                    <path
                      d={`M${x - 3} ${y - 3}l6 6m-6 0l6-6`}
                      stroke="#98a68d"
                    />
                  </g>
                )),
              )}
              {rails.map((rail, i) => (
                <g key={rail.id} data-rail={rail.id}>
                  <rect
                    x={rail.x}
                    y={rail.y}
                    width={rail.width}
                    height={35 * MM}
                    rx={2}
                    fill="#bcc3bd"
                    stroke="#97a69b"
                  />
                  <rect
                    x={rail.x}
                    y={rail.y + 10}
                    width={rail.width}
                    height={35 * MM - 20}
                    fill="#d9dfd9"
                  />
                  <path
                    d={`M${rail.x} ${rail.y + 4}h${rail.width}M${rail.x} ${rail.y + 35 * MM - 4}h${rail.width}`}
                    stroke="#f5f7f4"
                    strokeWidth={3}
                  />
                  {Array.from(
                    { length: Math.floor(rail.width / 45) },
                    (_, n) => (
                      <rect
                        key={n}
                        x={rail.x + 15 + n * 45}
                        y={rail.y + 33}
                        width={17}
                        height={10}
                        rx={5}
                        fill="#99a89b"
                        stroke="#c2cbc3"
                      />
                    ),
                  )}
                  <text
                    x={rail.x}
                    y={rail.y - 13}
                    fontSize={11}
                    letterSpacing={1}
                    fill="#6b806c"
                  >
                    TH35 · SZYNA {i + 1}
                  </text>
                  {i < rails.length - 1 && (
                    <g>
                      <path
                        d={`M${rail.x + 10} ${rail.y + 161}h${rail.width - 20}M${rail.x + 10} ${rail.y + 175}h${rail.width - 20}`}
                        stroke="#d1d8c7"
                        strokeWidth={10}
                      />
                      <text
                        x={rail.x + 22}
                        y={rail.y + 167}
                        fontSize={8}
                        letterSpacing={2}
                        fill="#8b9a7e"
                      >
                        KORYTKO KABLOWE
                      </text>
                    </g>
                  )}
                </g>
              ))}
              {mountingPreview && (
                <g>
                  <rect
                    x={60}
                    y={nearestRail(project, mountingPreview).y - 5}
                    width={970}
                    height={35 * MM + 10}
                    rx={5}
                    fill="#45906b"
                    opacity={0.15}
                    stroke="#32815b"
                    strokeWidth={3}
                  />
                  <text
                    x={70}
                    y={nearestRail(project, mountingPreview).y - 21}
                    fill="#286c4e"
                    fontSize={14}
                  >
                    Upuść na szynie{" "}
                    {rails.findIndex(
                      (r) => r.id === nearestRail(project, mountingPreview).id,
                    ) + 1}
                  </text>
                </g>
              )}
            </>
          ) : (
            <>
              <rect
                x={30}
                y={25}
                width={1090}
                height={Math.max(
                  850,
                  ...project.circuit.devices.map(
                    (d) =>
                      project.schematic.devices[d.id].y +
                      schematicGeometry(catalog[d.productId]).height +
                      80,
                  ),
                )}
                fill="#fdfdf7"
                stroke="#d6dccc"
              />
              <text x={50} y={50} fill="#889377" fontSize={12}>
                SCHEMAT ROZWINIĘTY · symbole w spoczynku
              </text>
            </>
          )}
        </g>
      </svg>
      <GraphProvider cells={cells}>
        <Paper
          id={`paper-${view}`}
          className="electrical-paper"
          style={{ width: "100%", height: "100%", background: "transparent" }}
          renderElement={BoardDevice}
          renderLink={WireOverlay}
          transform={transformString}
          gridSize={10}
          interactive={
            movable
              ? { elementMove: true, linkMove: false, labelMove: false }
              : false
          }
          linkRouting={linkRoutingOrthogonal({
            cornerRadius: view === "physical" ? 6 : 0,
            margin: view === "physical" ? 25 : 20,
          })}
          options={{
            defaultConnectionPoint: { name: "anchor" },
            linkPinning: false,
            validateMagnet: () => false,
            guard: (event: dia.Event) =>
              !!(event.target as Element)?.closest(
                ".terminal-control,.device-control",
              ),
          }}
          onElementPointerClick={({ model, event }) =>
            useApp.getState().select(String(model.id), event.shiftKey)
          }
          onLinkPointerClick={({ model }) =>
            useApp.getState().select(String(model.id))
          }
          onElementPointerDown={({ model }) => {
            if (!movable) return;
            const s = useApp.getState();
            deviceDrag.current = Object.fromEntries(
              s.selection.includes(String(model.id))
                ? s.selection
                    .filter((id) => project[view].devices[id])
                    .map((id) => [id, { ...project[view].devices[id] }])
                : [
                    [
                      String(model.id),
                      { ...project[view].devices[String(model.id)] },
                    ],
                  ],
            );
          }}
          onElementPointerMove={({ model }) => {
            if (
              view === "physical" &&
              deviceDrag.current &&
              catalog[model.get("data").device.productId].mounting === "DIN"
            )
              setMountingPreview(model.position());
          }}
          onElementPointerUp={({ model }) => {
            setMountingPreview(null);
            if (!movable || !deviceDrag.current) return;
            const old = deviceDrag.current[String(model.id)],
              pos = model.position();
            if (
              old &&
              (Math.abs(old.x - pos.x) > 1 || Math.abs(old.y - pos.y) > 1)
            ) {
              const delta = { x: pos.x - old.x, y: pos.y - old.y };
              useApp
                .getState()
                .moveDevices(
                  Object.fromEntries(
                    Object.entries(deviceDrag.current).map(([id, p]) => [
                      id,
                      { x: p.x + delta.x, y: p.y + delta.y },
                    ]),
                  ),
                  view,
                );
            }
            deviceDrag.current = null;
          }}
          onBlankPointerClick={({ x, y }) => {
            const s = useApp.getState();
            if (panMode || panMoved.current) return;
            if (routeEditing && selectedWire)
              s.updateRoute(selectedWire.id, view, [
                ...(s.project[view].routes[selectedWire.id] ?? []),
                { x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 },
              ]);
            else if (s.adding) s.addDevice(s.adding, { x, y }, view);
            else if (s.wireStart) s.addWaypoint({ x, y });
            else s.select(null);
          }}
          onBlankPointerDown={({ event }) => {
            if (panMode || event.button === 1) {
              drag.current = {
                at: { x: event.clientX ?? 0, y: event.clientY ?? 0 },
                pan: { x: transform.x, y: transform.y },
              };
            }
          }}
        />
      </GraphProvider>
      {preview && (
        <svg className="board-preview" aria-hidden="true">
          <g style={{ transform: transformString, transformOrigin: "0 0" }}>
            <polyline
              points={preview.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={useApp.getState().wireColor}
              strokeWidth={3}
              strokeDasharray="7 5"
            />
            <circle
              cx={cursor!.x}
              cy={cursor!.y}
              r={6}
              fill="#fff"
              stroke="#a17835"
            />
          </g>
        </svg>
      )}
      {adding && cursor && (
        <div
          className="placement-label"
          style={{
            left: cursor.x * transform.scale + transform.x + 15,
            top: cursor.y * transform.scale + transform.y + 10,
          }}
        >
          Kliknij, aby zamontować
        </div>
      )}
      <div className="canvas-tools">
        <button
          aria-label="Narzędzie zaznaczania"
          className={!panMode ? "active" : ""}
          onClick={() => setPanMode(false)}
        >
          <MousePointer2 size={17} />
        </button>
        <button
          aria-label="Przesuwanie tablicy"
          className={panMode ? "active" : ""}
          onClick={() => setPanMode(true)}
        >
          <Hand size={17} />
        </button>
        <span />
        <button aria-label="Pomniejsz" onClick={() => zoom(0.8)}>
          <ZoomOut size={17} />
        </button>
        <button
          className="zoom-label"
          onClick={() => fit()}
          title="Dopasuj widok"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <button aria-label="Powiększ" onClick={() => zoom(1.25)}>
          <ZoomIn size={17} />
        </button>
        <button aria-label="Dopasuj widok" onClick={() => fit()}>
          <Maximize size={16} />
        </button>
      </div>
      <div className="board-actions">
        {view === "physical" && (
          <button
            onClick={() => useApp.getState().addRail()}
            title="Dodaj kolejną szynę TH35"
            aria-label="Dodaj szynę DIN"
          >
            <Plus size={15} />
            <span>Szyna DIN</span>
          </button>
        )}
        <button
          className="terminal-toggle"
          aria-pressed={showTerminals}
          onClick={() => useApp.getState().toggleTerminals()}
        >
          Zaciski
        </button>
      </div>
      {(selectedDevices.length > 0 || selectedWire) && (
        <div className="selection-tools">
          {selectedWire ? (
            <>
              <span className="wire-endpoints">
                {
                  project.circuit.devices.find(
                    (d) => d.id === selectedWire.from.deviceId,
                  )!.designation
                }
                :{selectedWire.from.terminalId}
                <span>→</span>
                {
                  project.circuit.devices.find(
                    (d) => d.id === selectedWire.to.deviceId,
                  )!.designation
                }
                :{selectedWire.to.terminalId}
              </span>
              <button
                className={routeEditing ? "active" : ""}
                aria-pressed={routeEditing}
                onClick={() => {
                  setRouteEditing(!routeEditing);
                  setPanMode(false);
                  useApp.getState().cancelWire();
                }}
              >
                <Route size={15} />
                {routeEditing ? "Zakończ trasę" : "Edytuj trasę"}
              </button>
              {!!project[view].routes[selectedWire.id]?.length && (
                <button
                  aria-label="Automatyczna trasa przewodu"
                  title="Przywróć automatyczną trasę"
                  onClick={() =>
                    useApp.getState().updateRoute(selectedWire.id, view, [])
                  }
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </>
          ) : (
            <>
              <Move size={15} />
              <strong>
                {selectedDevices.map((d) => d.designation).join(", ")}
              </strong>
              {view === "physical" &&
                selectedDevices.some(
                  (d) => catalog[d.productId].mounting === "DIN",
                ) && (
                  <select
                    aria-label="Przenieś zaznaczone na szynę"
                    value=""
                    onChange={(e) =>
                      useApp.getState().moveSelectionToRail(e.target.value)
                    }
                  >
                    <option value="">Przenieś na szynę…</option>
                    {rails.map((rail, i) => (
                      <option key={rail.id} value={rail.id}>
                        Szyna {i + 1}
                      </option>
                    ))}
                  </select>
                )}
              <span className="drag-help">Przeciągnij korpus</span>
            </>
          )}
          <button
            aria-label="Usuń zaznaczenie"
            onClick={() => useApp.getState().select(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {(routeEditing || wireStart || adding) && (
        <div className="board-instruction">
          {routeEditing
            ? "Kliknij, aby dodać punkt trasy. Przeciągnij punkt; dwuklik usuwa. Esc kończy."
            : wireStart
              ? "Wybierz drugi zacisk. Klikaj tablicę, aby wyznaczyć trasę. Esc anuluje."
              : "Kliknij wolne miejsce na tablicy. Aparaty DIN wskoczą na najbliższą szynę."}
        </div>
      )}
      {routeEditing && selectedWire && (
        <svg className="route-handles">
          <g style={{ transform: transformString, transformOrigin: "0 0" }}>
            {(project[view].routes[selectedWire.id] ?? []).map((point, i) => (
              <circle
                key={i}
                data-route-point={i}
                cx={point.x}
                cy={point.y}
                r={8 / transform.scale}
                fill="#fff8e4"
                stroke="#ca8c34"
                strokeWidth={2 / transform.scale}
                aria-label={`Punkt trasy ${i + 1}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId))
                    return;
                  const rect = host.current!.getBoundingClientRect();
                  event.currentTarget.setAttribute(
                    "cx",
                    String(
                      (event.clientX - rect.left - transform.x) /
                        transform.scale,
                    ),
                  );
                  event.currentTarget.setAttribute(
                    "cy",
                    String(
                      (event.clientY - rect.top - transform.y) /
                        transform.scale,
                    ),
                  );
                }}
                onPointerUp={(event) => {
                  if (!event.currentTarget.hasPointerCapture(event.pointerId))
                    return;
                  event.currentTarget.releasePointerCapture(event.pointerId);
                  const points = [
                    ...useApp.getState().project[view].routes[selectedWire.id],
                  ];
                  points[i] = {
                    x:
                      Math.round(
                        Number(event.currentTarget.getAttribute("cx")) / 10,
                      ) * 10,
                    y:
                      Math.round(
                        Number(event.currentTarget.getAttribute("cy")) / 10,
                      ) * 10,
                  };
                  useApp.getState().updateRoute(selectedWire.id, view, points);
                }}
                onDoubleClick={() =>
                  useApp.getState().updateRoute(
                    selectedWire.id,
                    view,
                    project[view].routes[selectedWire.id].filter(
                      (_, index) => index !== i,
                    ),
                  )
                }
              />
            ))}
          </g>
        </svg>
      )}
      <div className="canvas-caption">
        <span>
          {view === "physical"
            ? "TABLICA · PRZECIĄGNIJ PUSTE TŁO, ABY PRZESUNĄĆ"
            : "ARKUSZ SCHEMATU"}
        </span>
        <span>
          {project.circuit.devices.length} aparatów ·{" "}
          {project.circuit.conductors.length} żył
        </span>
      </div>
    </div>
  );
}
export const Board = memo(BoardView);
