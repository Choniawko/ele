import { boundReference } from "../knowledge/reference-examples";
import {
  boardCameras,
  openKnowledge,
  isKnowledgeHash,
} from "@/knowledge-navigation";
import { resolveKnowledge } from "../knowledge/bindings";
import { mountingInfo } from "@catalog/mounting-profiles";
import {
  enclosureWindows,
  distributionAtPoint,
  distributionProfile,
  placementPoint,
  occupiedModules,
  rowOccupancy,
} from "@model/distribution";
import { enclosureFor } from "@model/physical";
import {
  EnclosureBody,
  EnclosureHandle,
  EnclosureCover,
  ENCLOSURE_HEADER_OFFSET,
  TrunkBody,
} from "./PhysicalEnclosure";
import { PhysicalTools } from "./PhysicalTools";
import { measurementWirePath } from "./physical-highlight";
import type { PhysicalEnclosure, PhysicalTrunk } from "@model/index";
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
  enclosure?: PhysicalEnclosure;
}
interface WireData {
  bridge?: boolean;
  protective: boolean;
  color: string;
  selected: boolean;
  dimmed: boolean;
  description: string;
  wireId: string;
  external?: boolean;
  reveals?: PhysicalEnclosure[];
  covers?: PhysicalEnclosure[];
  trunks?: PhysicalTrunk[];
}
function WireOverlay({
  bridge,
  protective,
  color,
  selected,
  dimmed,
  description,
  wireId,
  external,
  reveals,
  covers,
  trunks,
}: WireData) {
  const layout = useLinkLayout();
  if (!layout) return null;
  const maskId = `wire-mask-${wireId}`;
  return (
    <g>
      {external || covers?.length || trunks?.length ? (
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={-10000}
            y={-10000}
            width={20000}
            height={20000}
          >
            <rect
              x={-10000}
              y={-10000}
              width={20000}
              height={20000}
              fill={external ? "black" : "white"}
            />
            {external &&
              reveals?.map((e) => (
                <rect
                  key={e.id}
                  x={e.position.x}
                  y={e.position.y}
                  width={e.width}
                  height={e.height}
                  fill="white"
                />
              ))}
            {external &&
              trunks
                ?.filter((t) => !t.closed)
                .map((t) => (
                  <path
                    key={t.id}
                    d={t.points
                      .map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`)
                      .join(" ")}
                    fill="none"
                    stroke="white"
                    strokeWidth={t.width}
                  />
                ))}
            {covers?.map((e) => (
              <rect
                key={e.id}
                x={e.position.x}
                y={e.position.y}
                width={e.width}
                height={e.height}
                rx={8}
                fill="black"
              />
            ))}
            {trunks
              ?.filter((t) => t.closed)
              .map((t) => (
                <path
                  key={t.id}
                  d={t.points
                    .map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`)
                    .join(" ")}
                  fill="none"
                  stroke="black"
                  strokeWidth={t.width + 4}
                />
              ))}
          </mask>
        </defs>
      ) : null}
      <g
        mask={
          external || covers?.length || trunks?.length
            ? `url(#${maskId})`
            : undefined
        }
        className="wire-overlay"
        data-wire={bridge ? undefined : wireId}
        data-bridge={bridge ? wireId : undefined}
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
    </g>
  );
}
function BoardDevice(
  data:
    | ElementData
    | {
        enclosure: PhysicalEnclosure;
        selected: boolean;
        dragHandle?: boolean;
        coverControl?: boolean;
      },
) {
  if (!("device" in data))
    return data.coverControl ? (
      <EnclosureCover enclosure={data.enclosure} />
    ) : data.dragHandle ? (
      <EnclosureHandle enclosure={data.enclosure} />
    ) : (
      <EnclosureBody enclosure={data.enclosure} selected={data.selected} />
    );
  const enclosure = data.enclosure;
  if (
    data.view === "physical" &&
    enclosure?.closed &&
    !enclosureWindows(enclosure).length
  )
    return null;
  const props: DeviceProps = {
    ...data,
    product: catalog[data.device.productId],
    showTerminals: data.showTerminals && !enclosure?.closed,
    onTerminal: (ref) => {
      useApp.getState().select(ref.deviceId);
      useApp.getState().terminalClick(ref, data.view);
    },
    onOperate: (state, actuator) =>
      useApp.getState().operate(data.device.id, state, undefined, actuator),
    onSetCurrent: (ratedCurrentA) =>
      useApp.getState().updateDevice(data.device.id, { ratedCurrentA }),
    onRcdTest: () => useApp.getState().testRcd(data.device.id),
    onExplainSymbol:
      resolveKnowledge(data.device.productId) ||
      boundReference(useApp.getState().project)
        ? (fragmentId) =>
            void openKnowledge(
              data.device.productId,
              data.device.id,
              undefined,
              fragmentId,
            )
        : undefined,
  };
  return data.view === "physical" ? (
    enclosure?.closed && enclosureWindows(enclosure).length ? (
      <g>
        <defs>
          <clipPath id={`front-${data.device.id}`}>
            {enclosureWindows(enclosure).map((w, i) => (
              <rect
                key={i}
                x={
                  enclosure.position.x +
                  w.x -
                  useApp.getState().project.physical.devices[data.device.id].x
                }
                y={
                  enclosure.position.y +
                  w.y -
                  useApp.getState().project.physical.devices[data.device.id].y
                }
                width={w.width}
                height={w.height}
              />
            ))}
          </clipPath>
        </defs>
        <g clipPath={`url(#front-${data.device.id})`}>
          <DevicePhysical {...props} />
        </g>
      </g>
    ) : (
      <DevicePhysical {...props} />
    )
  ) : (
    <DeviceSchematic {...props} />
  );
}
function BoardView({ view }: { view: "physical" | "schematic" }) {
  const project = useApp((s) => s.project),
    runtimeDevices = useApp((s) => s.runtime.devices),
    selection = useApp((s) => s.selection),
    knowledgeHighlight = useApp((s) => s.knowledgeHighlight),
    wireStart = useApp((s) => s.wireStart),
    showTerminals = useApp((s) => s.showTerminals),
    instrument = useApp((s) => s.instrument),
    adding = useApp((s) => s.adding),
    waypoints = useApp((s) => s.waypoints);
  const host = useRef<HTMLDivElement>(null),
    drag = useRef<{ at: Point; pan: Point } | null>(null),
    deviceDrag = useRef<Record<string, Point> | null>(null),
    enclosureDrag = useRef<PhysicalEnclosure | null>(null),
    previousSize = useRef<{ width: number; height: number } | null>(null),
    panMoved = useRef(false);
  const [transform, setTransform] = useState({ scale: 0.7, x: 0, y: 0 }),
    [panMode, setPanMode] = useState(false),
    [cursor, setCursor] = useState<Point | null>(null),
    [routeEditing, setRouteEditing] = useState(false),
    [mountingPreview, setMountingPreview] = useState<Point | null>(null);
  const focusedId = useApp((s) => s.focusedEnclosureId);
  const mountingTarget = useApp((s) => s.mountingTarget);
  useEffect(() => {
    boardCameras[view] = transform;
  }, [view, transform]);
  useEffect(() => {
    const restore = (event: Event) => {
      const cameras = (event as CustomEvent).detail;
      const c = cameras?.[view];
      if (
        c &&
        Number.isFinite(c.scale) &&
        c.scale > 0 &&
        Number.isFinite(c.x) &&
        Number.isFinite(c.y)
      )
        setTransform(c);
    };
    window.addEventListener("ele:restore-cameras", restore);
    return () => window.removeEventListener("ele:restore-cameras", restore);
  }, [view]);
  const [draggedProduct, setDraggedProduct] = useState<string | null>(null);
  const savedCamera = useRef<typeof transform | null>(null);
  const cameraProject = useRef(project.circuit.projectId);
  useEffect(() => {
    if (cameraProject.current !== project.circuit.projectId) {
      savedCamera.current = null;
      cameraProject.current = project.circuit.projectId;
    }
    if (view !== "physical") return;
    const e = project.physical.enclosures?.find((e) => e.id === focusedId);
    if (e) {
      if (!savedCamera.current) savedCamera.current = transform;
      const frame = requestAnimationFrame(() => {
        const size = host.current?.getBoundingClientRect();
        if (!size) return;
        const target = useApp.getState().mountingTarget;
        const origin =
          target?.enclosureId === e.id && e.distribution
            ? placementPoint(e, { ...target, slot: 0 })
            : e.position;
        const width = e.distribution ? e.width - 40 : e.width;
        const height =
          target?.enclosureId === e.id && e.distribution
            ? target.zone === "modules"
              ? distributionProfile.rowSpacing
              : distributionProfile.terminalSpacing
            : e.height;
        const top =
          (host.current
            ?.querySelector(".physical-tools")
            ?.getBoundingClientRect().height ?? 80) + 35;
        const fittedScale = Math.min(
          1.5,
          (size.width - 100) / width,
          (size.height - top - 70) / height,
        );
        const scale = Math.max(
          size.height < 320 ? 0.5 : size.width < 680 ? 0.65 : 0.25,
          fittedScale,
        );
        setTransform({
          scale,
          x: (size.width - width * scale) / 2 - (origin.x - 20) * scale,
          y:
            top +
            (size.height - top - 70 - height * scale) / 2 -
            origin.y * scale,
        });
      });
      return () => cancelAnimationFrame(frame);
    }
    if (savedCamera.current) {
      const camera = savedCamera.current;
      savedCamera.current = null;
      const frame = requestAnimationFrame(() => setTransform(camera));
      return () => cancelAnimationFrame(frame);
    }
    // Camera is captured only when entering focus, not on every pan.
  }, [
    focusedId,
    view,
    project.circuit.projectId,
    mountingTarget?.row,
    mountingTarget?.zone,
    project.physical.enclosures?.find((e) => e.id === focusedId)?.width,
    project.physical.enclosures?.find((e) => e.id === focusedId)?.height,
  ]);
  const rails = useMemo(() => mountingRails(project), [project]);
  const wireRouters = useMemo(
    () =>
      physicalWireRouters(
        project.circuit.devices,
        project.circuit.conductors,
        project.physical.enclosures,
      ),
    [
      project.circuit.devices,
      project.circuit.conductors,
      project.physical.enclosures,
    ],
  );
  const selectedWire = project.circuit.conductors.find((w) =>
    selection.includes(w.id),
  );
  const selectedDevices = project.circuit.devices.filter((d) =>
    selection.includes(d.id),
  );
  const measuredPath = useMemo(
    () => measurementWirePath(project, instrument.red, instrument.black),
    [project, instrument.red, instrument.black],
  );
  const movable = !panMode && !wireStart && !adding && !routeEditing;
  useEffect(() => {
    setRouteEditing(false);
  }, [selection[0], view]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        isKnowledgeHash(location.hash) ||
        (event.target as HTMLElement)?.closest(".reference-help")
      )
        return;
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
          ...(view === "physical"
            ? (currentProject.physical.enclosures?.map(
                (e) => e.position.x + e.width + 30,
              ) ?? [])
            : []),
          ...(view === "physical"
            ? (currentProject.physical.trunking?.flatMap((t) =>
                t.points.map((p) => p.x + 80),
              ) ?? [])
            : []),
        ),
        height = Math.max(
          view === "physical"
            ? Math.max(
                670,
                ...mountingRails(currentProject).map((rail) => rail.y + 205),
              )
            : 720,
          ...ps.map((p) => p.y + 250),
          ...(view === "physical"
            ? (currentProject.physical.enclosures?.map(
                (e) => e.position.y + e.height + 30,
              ) ?? [])
            : []),
          ...(view === "physical"
            ? (currentProject.physical.trunking?.flatMap((t) =>
                t.points.map((p) => p.y + 80),
              ) ?? [])
            : []),
        );
      const modular =
        view === "physical" &&
        currentProject.physical.enclosures?.some((e) => e.distribution);
      const top = modular
        ? (host.current
            ?.querySelector(".physical-tools")
            ?.getBoundingClientRect().bottom ?? size.top) -
          size.top +
          15
        : 35;
      const scale = Math.min(
        1.1,
        (size.width - 70) / width,
        (modular ? Math.max(80, size.height - top - 55) : size.height - 70) /
          height,
      );
      if (readable && (size.width < 680 || size.height < 320)) {
        const first = ps[0] ?? { x: 80, y: 90 };
        const shortViewport = size.height < 320;
        const workingScale = Math.max(shortViewport ? 0.5 : 0.65, scale);
        setTransform({
          scale: workingScale,
          x: 30 - first.x * workingScale,
          y:
            (modular ? top + 15 : shortViewport ? 45 : 90) -
            first.y * workingScale,
        });
      } else
        setTransform({
          scale,
          x: (size.width - width * scale) / 2,
          y: modular
            ? top + (size.height - top - 55 - height * scale) / 2
            : (size.height - height * scale) / 2,
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
  useEffect(() => {
    if (!useApp.getState().focusedEnclosureId) fit(true);
  }, [
    fit,
    rails.length,
    project.physical.enclosures?.filter((e) => e.distribution).length ?? 0,
  ]);
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
          enclosure:
            view === "physical" ? enclosureFor(project, d.id) : undefined,
          state: runtimeDevices[d.id],
          view,
          selected: selection.includes(d.id),
          showTerminals:
            showTerminals &&
            !(
              view === "physical" &&
              project.physical.presentation === "external" &&
              !enclosureFor(project, d.id)
            ),
          zoom: transform.scale,
          red: instrument.red ? terminalKey(instrument.red) : undefined,
          black: instrument.black ? terminalKey(instrument.black) : undefined,
          wireStart: wireStart ? terminalKey(wireStart) : undefined,
          highlighted: [
            ...knowledgeHighlight.map(terminalKey),
            ...(selectedWire
              ? [terminalKey(selectedWire.from), terminalKey(selectedWire.to)]
              : []),
          ],
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
      z: 1, // Terminals must remain clickable above selected wire hit areas.
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
        selected: selection.includes(w.id) || measuredPath.has(w.id),
        dimmed:
          (selection.some((id) =>
            project.circuit.conductors.some((w) => w.id === id),
          ) &&
            !selection.includes(w.id)) ||
          (!!measuredPath.size && !measuredPath.has(w.id)),
        external:
          view === "physical" && project.physical.presentation === "external",
        reveals:
          view === "physical"
            ? project.physical.enclosures?.filter((e) => !e.closed)
            : undefined,
        covers:
          view === "physical"
            ? project.physical.enclosures?.filter((e) => e.closed)
            : undefined,
        trunks:
          view === "physical"
            ? project.physical.trunking?.filter((t) =>
                t.conductorIds.includes(w.id),
              )
            : undefined,
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
    const bridges: LinkRecord[] = project.circuit.bridges.map((b) => ({
      id: b.id,
      type: "link",
      source: {
        id: b.from.deviceId,
        port: b.from.terminalId,
        anchor: { name: "center" },
      },
      target: {
        id: b.to.deviceId,
        port: b.to.terminalId,
        anchor: { name: "center" },
      },
      z: 3,
      attrs: {
        line: { pointerEvents: "none" },
        wrapper: { pointerEvents: "none" },
      },
      style: {
        color: "transparent",
        width: 4,
        targetMarker: "none",
        sourceMarker: "none",
      },
      data: {
        bridge: true,
        protective: false,
        color: "#b19856",
        selected: selection.includes(b.id),
        dimmed: false,
        description: `Mostek ${b.from.terminalId}–${b.to.terminalId}`,
        wireId: b.id,
      },
    }));
    const boxes: ElementRecord[] =
      view === "physical"
        ? (project.physical.enclosures ?? []).map((enclosure) => ({
            id: enclosure.id,
            type: "element",
            position: enclosure.position,
            size: { width: enclosure.width, height: enclosure.height },
            z: 0,
            data: { enclosure, selected: selection.includes(enclosure.id) },
          }))
        : [];
    const headers: ElementRecord[] =
      view === "physical"
        ? (project.physical.enclosures ?? []).map((enclosure) => ({
            id: `handle:${enclosure.id}`,
            type: "element",
            position: {
              x: enclosure.position.x,
              y: enclosure.position.y - ENCLOSURE_HEADER_OFFSET,
            },
            size: { width: enclosure.width, height: 24 },
            z: 4,
            data: {
              enclosure,
              selected: selection.includes(enclosure.id),
              dragHandle: true,
            },
          }))
        : [];
    const covers: ElementRecord[] =
      view === "physical"
        ? (project.physical.enclosures ?? []).map((enclosure) => ({
            id: `cover:${enclosure.id}`,
            type: "element",
            position: {
              x: enclosure.position.x + 12,
              y: enclosure.position.y + enclosure.height + 10,
            },
            size: { width: enclosure.width - 24, height: 20 },
            z: 5,
            data: { enclosure, selected: false, coverControl: true },
          }))
        : [];
    return [...boxes, ...wires, ...elements, ...bridges, ...headers, ...covers];
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
    knowledgeHighlight,
    wireRouters,
    measuredPath,
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
            "button,input,select,.physical-tools,.selection-tools,.canvas-tools,.board-actions,.route-handles",
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
        if (
          (e.target as Element).closest(
            ".physical-tools,.distribution-dialog,.selection-tools,.canvas-tools",
          )
        )
          return;
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
      onDragOver={(e) => {
        e.preventDefault();
        const rect = host.current!.getBoundingClientRect();
        setDraggedProduct(useApp.getState().adding);
        setCursor({
          x: (e.clientX - rect.left - transform.x) / transform.scale,
          y: (e.clientY - rect.top - transform.y) / transform.scale,
        });
      }}
      onDragLeave={() => {
        setDraggedProduct(null);
        setCursor(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDraggedProduct(null);
        setMountingPreview(null);
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
                width={Math.max(
                  1040,
                  ...project.circuit.devices.map(
                    (d) =>
                      project.physical.devices[d.id].x +
                      catalog[d.productId].dimensions.value!.width * MM +
                      40,
                  ),
                  ...(project.physical.enclosures?.map(
                    (e) => e.position.x + e.width + 40,
                  ) ?? []),
                )}
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
              {!project.physical.enclosures &&
                [50, 1040].flatMap((x) =>
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
              {project.physical.trunking?.map((t) => (
                <TrunkBody key={t.id} trunk={t} />
              ))}
              {rails
                .filter(
                  (rail) =>
                    !(project.physical.enclosures ?? []).some(
                      (e) =>
                        e.closed &&
                        rail.x >= e.position.x &&
                        rail.x + rail.width <= e.position.x + e.width &&
                        rail.y >= e.position.y &&
                        rail.y <= e.position.y + e.height,
                    ),
                )
                .map((rail, i) => (
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
                    {!project.physical.trunking && i < rails.length - 1 && (
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
              {mountingPreview &&
                !distributionAtPoint(project, mountingPreview) && (
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
                        (r) =>
                          r.id === nearestRail(project, mountingPreview).id,
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
            ...(view === "schematic"
              ? {
                  defaultConnector: {
                    name: "jumpover",
                    args: { size: 5, jump: "gap" },
                  },
                }
              : {}),
            validateMagnet: () => false,
            guard: (event: dia.Event) =>
              !!(event.target as Element)?.closest(
                ".terminal-control,.device-control",
              ),
          }}
          onElementPointerClick={({ model, event, x, y }) => {
            const s = useApp.getState();
            if (
              s.adding &&
              model.get("data")?.enclosure &&
              !model.get("data")?.device
            ) {
              s.addDevice(s.adding, { x, y }, view);
              return;
            }
            useApp
              .getState()
              .select(
                model.get("data")?.dragHandle
                  ? model.get("data").enclosure.id
                  : String(model.id),
                event.shiftKey,
              );
          }}
          onLinkPointerClick={({ model, event }) =>
            useApp.getState().select(String(model.id), event.shiftKey)
          }
          onElementPointerDown={({ model }) => {
            if (!movable) return;
            const s = useApp.getState();
            const box =
              view === "physical" &&
              !model.get("data")?.device &&
              model.get("data")?.enclosure;
            if (box) {
              enclosureDrag.current = box;
              return;
            }
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
            if (enclosureDrag.current) {
              const e = enclosureDrag.current,
                raw = model.position(),
                pos = {
                  x: raw.x,
                  y:
                    raw.y +
                    (model.get("data")?.dragHandle
                      ? ENCLOSURE_HEADER_OFFSET
                      : 0),
                };
              const cover = model.graph?.getCell(`cover:${e.id}`);
              if (cover?.isElement())
                cover.position({ x: pos.x + 12, y: pos.y + e.height + 10 });
              const boxCell = model.graph?.getCell(e.id),
                header = model.graph?.getCell(`handle:${e.id}`);
              if (boxCell?.isElement() && boxCell !== model)
                boxCell.position(pos);
              if (header?.isElement() && header !== model)
                header.position({
                  x: pos.x,
                  y: pos.y - ENCLOSURE_HEADER_OFFSET,
                });
              for (const id of e.deviceIds) {
                const cell = model.graph?.getCell(id),
                  at = project.physical.devices[id];
                if (cell?.isElement())
                  cell.position({
                    x: at.x + pos.x - e.position.x,
                    y: at.y + pos.y - e.position.y,
                  });
              }
              return;
            }
            if (
              view === "physical" &&
              deviceDrag.current &&
              model.get("data").device &&
              catalog[model.get("data").device.productId].mounting === "DIN"
            ) {
              setMountingPreview(model.position());
              setDraggedProduct(model.get("data").device.productId);
            }
          }}
          onElementPointerUp={({ model }) => {
            setMountingPreview(null);
            setDraggedProduct(null);
            if (enclosureDrag.current) {
              const old = enclosureDrag.current,
                raw = model.position(),
                pos = {
                  x: raw.x,
                  y:
                    raw.y +
                    (model.get("data")?.dragHandle
                      ? ENCLOSURE_HEADER_OFFSET
                      : 0),
                };
              enclosureDrag.current = null;
              const cover = model.graph?.getCell(`cover:${old.id}`);
              if (cover?.isElement())
                cover.position({
                  x: old.position.x + 12,
                  y: old.position.y + old.height + 10,
                });
              const boxCell = model.graph?.getCell(old.id),
                header = model.graph?.getCell(`handle:${old.id}`);
              if (boxCell?.isElement()) boxCell.position(old.position);
              if (header?.isElement())
                header.position({
                  x: old.position.x,
                  y: old.position.y - ENCLOSURE_HEADER_OFFSET,
                });
              for (const id of old.deviceIds) {
                const cell = model.graph?.getCell(id);
                if (cell?.isElement())
                  cell.position(project.physical.devices[id]);
              }
              if (
                movable &&
                (old.position.x !== pos.x || old.position.y !== pos.y)
              )
                useApp.getState().moveEnclosure(old.id, pos);
              return;
            }
            if (!movable || !deviceDrag.current) return;
            const old = deviceDrag.current[String(model.id)],
              pos = model.position();
            if (
              old &&
              (Math.abs(old.x - pos.x) > 1 || Math.abs(old.y - pos.y) > 1)
            ) {
              const delta = { x: pos.x - old.x, y: pos.y - old.y };
              model.position(old);
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
      {view === "physical" &&
        (() => {
          const at = mountingPreview ?? cursor,
            productId = draggedProduct ?? adding;
          if (!at || !productId || !catalog[productId]) return null;
          const drop = distributionAtPoint(project, at);
          if (!drop) return null;
          const { enclosure: e, zone, row, slot } = drop,
            info = mountingInfo(catalog[productId]);
          const point = placementPoint(e, { zone, row, slot }),
            width = occupiedModules(info);
          const occupied = rowOccupancy(project, e, zone, row, (id) =>
            mountingInfo(catalog[id]),
          );
          const moving = Object.keys(deviceDrag.current ?? {});
          for (const id of moving) {
            const placement = e.distribution!.placements[id];
            if (placement?.zone === zone && placement.row === row) {
              const d = project.circuit.devices.find((d) => d.id === id)!;
              for (
                let i = placement.slot;
                i <
                placement.slot +
                  occupiedModules(mountingInfo(catalog[d.productId]));
                i++
              )
                occupied.delete(i);
            }
          }
          const valid =
            !e.closed &&
            info.zone === zone &&
            slot >= 0 &&
            slot + width <= e.distribution!.modulesPerRow &&
            row >= 0 &&
            row <
              (zone === "modules"
                ? e.distribution!.rows
                : distributionProfile.terminalRows) &&
            Array.from({ length: width }, (_, i) => slot + i).every(
              (i) => !occupied.has(i),
            );
          return (
            <svg
              className="board-preview distribution-drop-preview"
              aria-hidden="true"
            >
              <g style={{ transform: transformString, transformOrigin: "0 0" }}>
                <rect
                  data-mounting-preview={valid ? "free" : "blocked"}
                  x={point.x}
                  y={point.y}
                  width={
                    width *
                    distributionProfile.moduleMm *
                    distributionProfile.scale
                  }
                  height={info.height * distributionProfile.scale}
                  fill={valid ? "#45906b40" : "#b4514540"}
                  stroke={valid ? "#32815b" : "#b45145"}
                  strokeWidth={3}
                />
                <text
                  x={point.x}
                  y={point.y - 12}
                  fontSize={14}
                  fill={valid ? "#32815b" : "#b45145"}
                >
                  {valid
                    ? `Pole ${slot + 1} · ${width}M`
                    : "Brak miejsca / niezgodny montaż"}
                </text>
              </g>
            </svg>
          );
        })()}
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
      {view === "physical" && <PhysicalTools />}
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
        {view === "physical" && !focusedId && (
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
                    {project.physical.trunking?.map((t) => (
                      <TrunkBody key={t.id} trunk={t} />
                    ))}
                    {rails
                      .filter(
                        (rail) =>
                          !(project.physical.enclosures ?? []).some(
                            (e) =>
                              e.closed &&
                              rail.x >= e.position.x &&
                              rail.x + rail.width <= e.position.x + e.width &&
                              rail.y >= e.position.y &&
                              rail.y <= e.position.y + e.height,
                          ),
                      )
                      .map((rail, i) => (
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
      {knowledgeHighlight.length > 0 && (
        <div className="knowledge-board-hint" role="status">
          Pomoc wskazuje:{" "}
          {knowledgeHighlight
            .map(
              (ref) =>
                `${project.circuit.devices.find((d) => d.id === ref.deviceId)?.designation}:${ref.terminalId}`,
            )
            .join(" ↔ ")}
          <button onClick={() => useApp.setState({ knowledgeHighlight: [] })}>
            Zamknij wskazanie
          </button>
        </div>
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
