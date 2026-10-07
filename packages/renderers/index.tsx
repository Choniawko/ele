import { memo } from "react";
import { LoadVisual } from "./loads";
import type { Product, InternalConnection } from "@catalog/index";
import type { DeviceInstance, TerminalRef } from "@model/index";
import type { DeviceRuntime } from "@simulation/index";
export const MM = 2.2;
export interface DeviceProps {
  product: Product;
  device: DeviceInstance;
  state?: DeviceRuntime;
  selected?: boolean;
  showTerminals?: boolean;
  zoom?: number;
  red?: string;
  black?: string;
  wireStart?: string;
  highlighted?: string[];
  onTerminal?: (ref: TerminalRef) => void;
  onOperate?: (state?: boolean, actuator?: "start" | "stop") => void;
  onSetCurrent?: (currentA: number) => void;
  onRcdTest?: () => void;
  onSelect?: () => void;
  thumbnail?: boolean;
}
function Screw({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={2.5}
        fill="#b7babc"
        stroke="#828889"
        strokeWidth={0.5}
      />
      <path
        d={`M${x - 1.4} ${y - 1.4}l2.8 2.8m-2.8 0l2.8-2.8`}
        stroke="#555e5d"
        strokeWidth={0.5}
      />
    </g>
  );
}
function Physical({
  product: p,
  device: d,
  state: s,
  selected,
  showTerminals = true,
  zoom = 1,
  red,
  black,
  wireStart,
  highlighted,
  onTerminal,
  onOperate,
  onSetCurrent,
  onRcdTest,
  onSelect,
  thumbnail,
}: DeviceProps) {
  const dim = p.dimensions.value!;
  const w = dim.width,
    h = dim.height;
  const on =
    p.behaviorId === "load" ||
    p.behaviorId === "motor" ||
    p.behaviorId === "power-supply"
      ? !!s?.powered
      : p.topology.coil || p.topology.supply || p.behaviorId === "auxiliary"
        ? !!s?.mechanism
        : !!(s?.manual ?? d.settings.position) && !s?.tripped;
  const bodyColor =
    p.visualId === "tesys-contactor"
      ? "#2d3430"
      : p.visualId === "contactor"
        ? "#dce0dc"
        : p.visualId === "source"
          ? "#e6ede7"
          : "#f4f3ed";
  const body = (
    <>
      <rect
        x={1}
        y={1.5}
        width={w}
        height={h}
        rx={2.2}
        fill="#000"
        opacity={0.09}
      />
      <rect
        data-device-body={d.designation}
        width={w}
        height={h}
        rx={2}
        fill={bodyColor}
        stroke="#aeb6b0"
        strokeWidth={0.6}
      />
      <path
        d={`M2 2H${w - 2}V${h - 2}`}
        fill="none"
        stroke="#fff"
        strokeWidth={0.8}
      />
    </>
  );
  const stop = (event: React.PointerEvent) => event.stopPropagation();
  const actionProps = {
    onPointerDown: stop,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onOperate?.();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onOperate?.();
      }
    },
    role: "button",
    tabIndex: onOperate ? 0 : undefined,
    "aria-label": `Przełącz ${d.designation}`,
  };
  const rcd = ["rccb", "rcbo"].includes(p.behaviorId);
  const leverProps = {
    ...actionProps,
    "aria-pressed": on,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onOperate?.(s?.tripped ? false : !on);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        onOperate?.(s?.tripped ? false : !on);
      }
    },
  };
  const testProps = {
    ...actionProps,
    tabIndex: onRcdTest ? 0 : undefined,
    "aria-label": `TEST ${d.designation}`,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onRcdTest?.();
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        onRcdTest?.();
      }
    },
  };
  const momentaryProps = (actuator?: "start" | "stop") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      onOperate?.(true, actuator);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.stopPropagation();
      onOperate?.(false, actuator);
    },
    onPointerCancel: () => onOperate?.(false, actuator),
    onLostPointerCapture: () => onOperate?.(false, actuator),
    onBlur: () => onOperate?.(false, actuator),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        onOperate?.(true, actuator);
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onOperate?.(false, actuator);
      }
    },
    role: "button",
    tabIndex: onOperate ? 0 : undefined,
    "aria-label": `Przytrzymaj ${d.designation}${actuator ? ` ${actuator.toUpperCase()}` : ""}`,
  });
  const buttonProps = momentaryProps();
  const adjustCurrent = (delta: number) =>
    onSetCurrent?.(
      Math.max(
        0.1,
        Math.min(
          1000,
          Math.round(((d.settings.ratedCurrentA ?? 4.35) + delta) * 100) / 100,
        ),
      ),
    );
  return (
    <g
      className={`device-vector ${thumbnail ? "thumbnail" : ""}`}
      transform={`scale(${MM})`}
      onClick={onSelect}
      data-device={d.designation}
      data-powered={s?.powered ? "true" : "false"}
      data-mechanism={s?.mechanism ? "true" : "false"}
      data-direction={s?.direction}
      data-winding-connection={s?.windingConnection}
    >
      {selected && (
        <rect
          x={-3}
          y={-3}
          width={w + 6}
          height={h + 6}
          rx={4}
          fill="#edf7f0"
          stroke="#2b8064"
          strokeWidth={0.9}
          strokeDasharray="2 1"
        />
      )}
      {!thumbnail && (
        <text
          x={w / 2}
          y={-10}
          textAnchor="middle"
          fontSize={
            ["edu-rail-terminal", "edu-motor-aux-no"].includes(p.id)
              ? Math.min(6, w / (d.designation.length * 0.6))
              : 6
          }
          fontWeight={600}
          fill="#314d43"
        >
          {d.designation}
        </text>
      )}
      {p.visualId !== "bulkhead" && body}
      {p.visualId === "hager-mcb" && (
        <>
          <rect x={1} y={6} width={w - 2} height={16} fill="#e8e9e4" />
          <Screw x={w / 2} y={10} />
          <Screw x={w / 2} y={h - 10} />
          <rect
            x={0.8}
            y={23}
            width={w - 1.6}
            height={42}
            fill="#fbfaf6"
            stroke="#d7dbd3"
            strokeWidth={0.4}
          />
          <text
            x={w / 2}
            y={30}
            textAnchor="middle"
            fill="#0788a2"
            fontWeight="bold"
            fontSize={4.2}
          >
            hager
          </text>
          <text
            x={w / 2}
            y={36}
            textAnchor="middle"
            fill="#5a655f"
            fontSize={2.6}
          >
            MBN116E
          </text>
          <text
            x={w / 2}
            y={41}
            textAnchor="middle"
            fill="#343f3a"
            fontSize={3.7}
            fontWeight="bold"
          >
            B16
          </text>
          <g {...actionProps} className="device-control">
            <rect
              x={3.5}
              y={45}
              width={w - 7}
              height={13}
              rx={1}
              fill="#d7dbd7"
              stroke="#9fa8a1"
              strokeWidth={0.4}
            />
            <rect
              x={4}
              y={on ? 45.5 : 51}
              width={w - 8}
              height={6}
              rx={0.8}
              fill="#657276"
            />
            <path
              d={`M5 ${on ? 47 : 52.5}H${w - 5}`}
              stroke="#a9b5b4"
              strokeWidth={0.6}
            />
            <text
              x={w / 2}
              y={on ? 50 : 55.5}
              textAnchor="middle"
              fill="white"
              fontSize={3}
            >
              {on ? "I" : "O"}
            </text>
          </g>
          <rect
            x={2.5}
            y={60}
            width={w - 5}
            height={9}
            rx={0.7}
            fill="#e6edf0"
            stroke="#bdc8c8"
            strokeWidth={0.4}
          />
          <text
            x={w / 2}
            y={64}
            textAnchor="middle"
            fill="#71867f"
            fontSize={2.2}
          >
            230/400 V~
          </text>
          <text
            x={w / 2}
            y={67}
            textAnchor="middle"
            fill="#71867f"
            fontSize={2}
          >
            6000 · 3
          </text>
        </>
      )}
      {p.visualId === "motor-protection" && (
        <>
          <rect x={3} y={10} width={w - 6} height={63} rx={2} fill="#d9dfd8" />
          <text
            x={w / 2}
            y={17}
            fontSize={3.4}
            textAnchor="middle"
            fill="#345443"
          >
            SILNIK · EDU
          </text>
          <g
            role="button"
            tabIndex={onSetCurrent ? 0 : undefined}
            aria-label={`Nastawa ${d.designation} [A]`}
            className="device-control"
            onPointerDown={stop}
            onClick={(e) => {
              e.stopPropagation();
              adjustCurrent(e.shiftKey ? -0.1 : 0.1);
            }}
            onKeyDown={(e) => {
              if (
                ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                e.stopPropagation();
                const step =
                  e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.1 : -0.1;
                adjustCurrent(step);
              }
            }}
          >
            <title>
              Nastawa przeciążenia: klik +0,1 A, Shift+klik −0,1 A, strzałki
              ±0,1 A. Dokładna wartość w danych aparatu. Zmiana zatrzymuje
              próbę.
            </title>
            <circle cx={w / 2} cy={29} r={8} fill="#f1eee0" stroke="#65715e" />
            <path d={`M${w / 2} 29l4-5`} stroke="#42583d" strokeWidth={1.5} />
            <text
              x={w / 2}
              y={43}
              textAnchor="middle"
              fontSize={4}
              fill="#345443"
            >
              {d.settings.ratedCurrentA ?? 4.35} A
            </text>
          </g>
          <g
            {...leverProps}
            className="device-control"
            data-motor-protection={s?.tripped ? "tripped" : on ? "on" : "off"}
          >
            <title>
              {s?.tripped
                ? "TRIPPED — reset przez OFF, następnie ON"
                : "Wspólne ON / OFF trzech torów"}
            </title>
            <rect
              x={5}
              y={47}
              width={w - 10}
              height={16}
              rx={2}
              fill={s?.tripped ? "#c77e2c" : on ? "#367651" : "#657268"}
            />
            <text
              x={w / 2}
              y={57}
              textAnchor="middle"
              fill="white"
              fontSize={4.5}
            >
              {s?.tripped ? "RESET / OFF" : on ? "I · ON" : "O · OFF"}
            </text>
          </g>
          <text
            x={w / 2}
            y={70}
            textAnchor="middle"
            fontSize={3.5}
            fill={s?.tripped ? "#a34c32" : "#476353"}
          >
            {s?.tripped ? "TRIPPED" : "1–2 · 3–4 · 5–6"}
          </text>
        </>
      )}
      {p.visualId === "start-stop" && (
        <>
          <rect
            x={2}
            y={12}
            width={w - 4}
            height={59}
            rx={2}
            fill="#d7ded1"
            stroke="#a7b59d"
          />
          {(p.behaviorId === "push-start-stop"
            ? (["stop", "start"] as const)
            : (["start"] as const)
          ).map((actuator, i) => {
            const pressed = actuator === "stop" ? s?.stopPressed : s?.manual;
            const cx = p.behaviorId === "push-start-stop" ? 9 + i * 18 : w / 2;
            return (
              <g
                key={actuator}
                {...momentaryProps(
                  p.behaviorId === "push-start-stop" ? actuator : undefined,
                )}
                className="device-control"
                aria-pressed={!!pressed}
              >
                <circle
                  cx={cx}
                  cy={pressed ? 39 : 37}
                  r={6.5}
                  fill={actuator === "stop" ? "#b14e42" : "#397b53"}
                  stroke="#445c43"
                  strokeWidth={1}
                />
                <text
                  x={cx}
                  y={55}
                  textAnchor="middle"
                  fontSize={3.1}
                  fill="#3e573e"
                >
                  {actuator === "stop"
                    ? "STOP"
                    : p.behaviorId === "push-start-stop"
                      ? "START"
                      : "NO"}
                </text>
              </g>
            );
          })}
          <text
            x={w / 2}
            y={65}
            textAnchor="middle"
            fontSize={2.7}
            fill="#61735b"
          >
            {p.mounting === "DIN" ? "TH35" : "PANEL"}
          </text>
        </>
      )}
      {p.visualId === "protection" && (
        <>
          {(w < 25 ? [w / 2] : [12, w - 12]).map((x, i) => (
            <g key={i}>
              <Screw x={x} y={9} />
              <Screw x={x} y={h - 9} />
            </g>
          ))}
          <rect
            x={3}
            y={24}
            width={w - 6}
            height={40}
            fill="#fafbf6"
            stroke="#d5dcd5"
            strokeWidth={0.5}
          />
          <text x={5} y={32} fontSize={4} fill="#376855">
            {p.behaviorId.toUpperCase()}
          </text>
          <text x={5} y={40} fontSize={4} fill="#58665e">
            {p.behaviorId === "mcb"
              ? `${p.topology.poles?.length === 3 ? "C" : "B"}${d.settings.ratedCurrentA ?? p.defaults.ratedCurrentA ?? 16}`
              : p.behaviorId === "switch"
                ? "2P"
                : p.behaviorId === "rcbo"
                  ? "B16 / 30 mA"
                  : "40 A / 30 mA"}
          </text>
          {rcd ? (
            <>
              <g
                {...leverProps}
                className="device-control"
                data-rcd-lever={s?.tripped ? "tripped" : on ? "on" : "off"}
              >
                <title>
                  {s?.tripped
                    ? "Wyzwolony — przestaw na OFF, następnie ON"
                    : "Dźwignia ON / OFF"}
                </title>
                <rect
                  x={5}
                  y={44}
                  width={18}
                  height={21}
                  rx={1.5}
                  fill="#c5cbc6"
                  stroke="#87958b"
                  strokeWidth={0.6}
                />
                <rect
                  x={8}
                  y={46}
                  width={12}
                  height={17}
                  rx={1}
                  fill="#36463e"
                />
                <rect
                  x={6}
                  y={s?.tripped ? 51 : on ? 46 : 56}
                  width={16}
                  height={7}
                  rx={1}
                  fill="#626d66"
                  stroke="#eef0e8"
                  strokeWidth={0.6}
                />
                <path
                  d={`M9 ${s?.tripped ? 54 : on ? 49 : 59}h10`}
                  stroke="#d9dfd6"
                  strokeWidth={0.8}
                />
                <text
                  x={14}
                  y={43}
                  fontSize={3}
                  textAnchor="middle"
                  fill="#365b45"
                >
                  I ON
                </text>
                <text
                  x={14}
                  y={70}
                  fontSize={3}
                  textAnchor="middle"
                  fill="#58665e"
                >
                  O OFF
                </text>
              </g>
              <g {...testProps} className="device-control" data-rcd-test>
                <title>
                  TEST — próba wyzwolenia przy zasilonym i załączonym RCD
                </title>
                <rect
                  x={28}
                  y={46}
                  width={15}
                  height={14}
                  rx={2}
                  fill="#dfc270"
                  stroke="#9b8649"
                  strokeWidth={0.7}
                />
                <rect
                  x={30}
                  y={48}
                  width={11}
                  height={10}
                  rx={1.3}
                  fill="#f3dfa4"
                />
                <text
                  x={35.5}
                  y={54.5}
                  textAnchor="middle"
                  fontSize={3.2}
                  fontWeight={600}
                  fill="#554b2f"
                >
                  TEST
                </text>
              </g>
            </>
          ) : (
            <g {...actionProps} className="device-control">
              <rect
                x={5}
                y={46}
                width={18}
                height={13}
                rx={1.4}
                fill={on ? "#32685b" : "#687370"}
              />
              <text x={14} y={54} fontSize={4} textAnchor="middle" fill="#fff">
                {on ? "I ON" : "O OFF"}
              </text>
            </g>
          )}
        </>
      )}
      {p.visualId === "source" && (
        <>
          <rect x={5} y={6} width={w - 10} height={44} rx={2} fill="#193c33" />
          <text
            x={w / 2}
            y={17}
            fontSize={3.2}
            textAnchor="middle"
            fill="#b7cec1"
          >
            ŹRÓDŁO DYDAKTYCZNE
          </text>
          <text
            x={w / 2}
            y={33}
            fontSize={11}
            textAnchor="middle"
            fill={s?.voltageV ? "#d4e7c8" : "#9cae9b"}
            fontFamily="monospace"
          >
            {d.settings.voltageV ?? 230}
            <tspan fontSize={4}> V</tspan>
          </text>
          <text
            x={w / 2}
            y={42}
            fontSize={4}
            textAnchor="middle"
            fill="#a0bba9"
          >
            {p.behaviorId === "source-dc"
              ? "DC · izolowane"
              : p.behaviorId === "source-3ph"
                ? "3~ · 50 Hz · TN-S"
                : "1~ · 50 Hz · TN-S"}
          </text>
          <circle
            cx={w - 9}
            cy={h - 8}
            r={1.5}
            fill={s?.voltageV ? "#75a875" : "#b6beb1"}
          />
        </>
      )}
      {["lamp", "heater", "fan", "motor"].includes(p.visualId) && (
        <LoadVisual
          visualId={p.visualId}
          device={d}
          state={s}
          on={on}
          width={w}
        />
      )}
      {p.visualId === "switch" && (
        <>
          <rect
            x={4}
            y={12}
            width={w - 8}
            height={42}
            rx={2}
            fill="#e8e9e1"
            stroke="#b7beb0"
            strokeWidth={0.5}
          />
          <g {...actionProps} className="device-control">
            <path
              d={`M7 ${on ? 14 : 19}H${w - 7}V${on ? 47 : 52}H7Z`}
              fill="#fffef8"
              stroke="#c2c8b9"
              strokeWidth={0.8}
            />
            <path
              d={`M11 ${on ? 47 : 19}H${w - 11}`}
              stroke="#d9dccf"
              strokeWidth={1.1}
            />
            <text
              x={w / 2}
              y={36}
              textAnchor="middle"
              fill="#87927e"
              fontSize={5}
            >
              {p.behaviorId === "changeover"
                ? "↔"
                : p.behaviorId === "crossover"
                  ? "×"
                  : on
                    ? "I"
                    : "O"}
            </text>
          </g>
          <text
            x={w / 2}
            y={61}
            fontSize={3}
            textAnchor="middle"
            fill="#72806a"
          >
            NAKŁADKA ZACISKOWA
          </text>
        </>
      )}
      {p.visualId === "harmony-button" && (
        <>
          <rect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            rx={2}
            fill="#343b38"
          />
          <circle
            cx={15}
            cy={18}
            r={13}
            fill="#212725"
            stroke="#758078"
            strokeWidth={0.7}
          />
          <g {...buttonProps} className="device-control">
            <circle
              cx={15}
              cy={s?.manual ? 19 : 18}
              r={11}
              fill={s?.manual ? "#28644a" : "#45876b"}
              stroke="#183f2f"
            />
            <path
              d="M7 12q8-6 16 0"
              stroke="#a1c8af"
              strokeWidth={0.7}
              fill="none"
            />
          </g>
          <text x={15} y={36} textAnchor="middle" fontSize={2.5} fill="#e1e7dd">
            TYŁ · nadruk / ISO
          </text>
        </>
      )}
      {p.visualId === "tesys-contactor" && (
        <>
          <rect x={2} y={2} width={w - 4} height={14} fill="#252c29" />
          <rect x={2} y={h - 16} width={w - 4} height={14} fill="#252c29" />
          <rect x={2} y={29} width={w - 4} height={9} rx={1} fill="#087d3c" />
          <text x={4} y={35} fontSize={3.7} fill="#eef7e8">
            TeSys
          </text>
          <text
            x={29}
            y={33.5}
            textAnchor="middle"
            fontSize={2.7}
            fill="#eef7e8"
          >
            Schneider
          </text>
          <text
            x={29}
            y={36.5}
            textAnchor="middle"
            fontSize={2.2}
            fill="#eef7e8"
          >
            Electric
          </text>
          <text x={2} y={26} fontSize={2.4} fill="#d7e0d5">
            LC1D09
          </text>
          <rect
            x={3}
            y={39}
            width={w - 6}
            height={18}
            rx={1.5}
            fill="#1c221f"
            stroke="#48534a"
            strokeWidth={0.5}
          />
          <rect
            x={6}
            y={44}
            width={10}
            height={6}
            fill={on ? "#74927d" : "#35453c"}
          />
          <path
            d={on ? "M7 47h8" : "M7 49l8-4"}
            stroke="#b9cdbb"
            strokeWidth={1}
          />
          <text x={29} y={47} textAnchor="middle" fontSize={2.6} fill="#c4d6c5">
            230 V~
          </text>
          <text x={29} y={52} textAnchor="middle" fontSize={2.4} fill="#aebfaf">
            {s?.mechanicallyBlocked ? "BLOKADA" : "9 A · AC-3"}
          </text>
          {p.topology.terminals
            .filter((t) => t.y === 0 || t.y === h)
            .map((t) => (
              <Screw key={t.id} x={t.x} y={t.y === 0 ? 7 : h - 7} />
            ))}
        </>
      )}
      {p.visualId === "auxiliary" && (
        <>
          <rect
            x={3}
            y={10}
            width={w - 6}
            height={h - 20}
            rx={1}
            fill="#d6ded3"
            stroke="#a3b09f"
            strokeWidth={0.6}
          />
          <text
            x={w / 2}
            y={21}
            fontSize={w < 20 ? 2.8 : 3.1}
            textAnchor="middle"
            fill="#4b624e"
          >
            {w < 20 ? "NO" : "BLOK 1NO + 1NC"}
          </text>
          <path
            d={
              w < 20
                ? on
                  ? "M6 27v13"
                  : "M6 27l3 13"
                : on
                  ? "M9 27v13 M27 27l4 13"
                  : "M9 27l4 13 M27 27v13"
            }
            stroke="#536b54"
            strokeWidth={1}
          />
          <text
            x={w / 2}
            y={46}
            fontSize={2.5}
            textAnchor="middle"
            fill="#617b5c"
          >
            {w < 20 ? "13–14" : "MECHANIZM NADRZĘDNY"}
          </text>
        </>
      )}
      {p.visualId === "button" && (
        <>
          <rect
            x={7}
            y={9}
            width={w - 14}
            height={43}
            rx={3}
            fill="#e0e3d9"
            stroke="#c7ccbe"
            strokeWidth={0.5}
          />
          <circle cx={w / 2} cy={30} r={18} fill="#525e52" />
          <g {...buttonProps} className="device-control">
            <circle
              cx={w / 2}
              cy={s?.manual ? 31 : 29}
              r={15}
              fill={p.behaviorId === "push-nc" ? "#b75e4e" : "#4b846b"}
              stroke={p.behaviorId === "push-nc" ? "#8d3e36" : "#2a6752"}
              strokeWidth={0.8}
            />
            <path
              d={`M${w / 2 - 9} 22q9-8 18 0`}
              fill="none"
              stroke="#fff"
              opacity={0.25}
              strokeWidth={1.5}
            />
            <text
              x={w / 2}
              y={33}
              textAnchor="middle"
              fill="#eff4e7"
              fontSize={4.5}
            >
              {p.behaviorId === "push-nc" ? "STOP" : "START"}
            </text>
          </g>
        </>
      )}
      {(p.visualId === "contactor" || p.visualId === "relay") && (
        <>
          <rect
            x={4}
            y={18}
            width={w - 8}
            height={h - 36}
            rx={1.5}
            fill={p.visualId === "relay" ? "#d9e6de" : "#56675e"}
            stroke="#a8b5a9"
            strokeWidth={0.7}
          />
          <rect
            x={8}
            y={23}
            width={Math.min(w - 16, 38)}
            height={h - 48}
            rx={1}
            fill="#f3f5ec"
            opacity={0.95}
          />
          <text x={11} y={31} fontSize={4.2} fill="#435f4a">
            {p.behaviorId === "thermal"
              ? "THERMAL"
              : p.visualId === "relay"
                ? "RELAY"
                : "CONTACTOR"}
          </text>
          <text x={11} y={39} fontSize={4} fill="#74816e">
            {p.topology.coil
              ? `${p.topology.coil.voltageV} V ${p.topology.coil.kind}`
              : `${d.settings.ratedCurrentA ?? 6} A`}
          </text>
          <rect
            x={12}
            y={46}
            width={23}
            height={12}
            rx={1}
            fill={on ? "#80a175" : "#b4bfa8"}
          />
          <text
            x={23.5}
            y={54}
            fontSize={3.5}
            textAnchor="middle"
            fill="#264b33"
          >
            {s?.tripped ? "TRIP" : on ? "ON" : "OFF"}
          </text>
          {p.topology.coil && (
            <circle
              cx={w - 14}
              cy={h / 2}
              r={3}
              fill={s?.coil ? "#8dbd72" : "#354d3b"}
            />
          )}
          {p.topology.terminals.map((t) => (
            <Screw
              key={t.id}
              x={Math.min(w - 4, Math.max(4, t.x))}
              y={t.y < h / 2 ? 7 : h - 7}
            />
          ))}
        </>
      )}
      {p.visualId === "timer" && (
        <>
          <rect x={1} y={24} width={w - 2} height={42} fill="#f8f9f1" />
          <rect x={1} y={27} width={w - 2} height={4} fill="#558b67" />
          <text
            x={w / 2}
            y={36}
            textAnchor="middle"
            fontSize={2.8}
            fill="#57734b"
          >
            DYDAKTYCZNY
          </text>
          <circle
            cx={6}
            cy={41}
            r={1.6}
            fill={s?.powered ? "#70a755" : "#a3ac94"}
          />
          <circle cx={12} cy={41} r={1.6} fill={on ? "#c68e54" : "#a3ac94"} />
          {p.behaviorId !== "bistable" && (
            <>
              <circle
                cx={w / 2}
                cy={52}
                r={5}
                fill="#d5deca"
                stroke="#94a489"
                strokeWidth={0.7}
              />
              <path d={`M${w / 2} 52l3-2`} stroke="#586953" strokeWidth={0.8} />
              <text
                x={w / 2}
                y={64}
                textAnchor="middle"
                fontSize={3}
                fill="#65775a"
              >
                {d.settings.timeS ?? 5} s {d.settings.timerMode ?? ""}
              </text>
            </>
          )}
          <text
            x={w / 2}
            y={70}
            fontSize={3.2}
            textAnchor="middle"
            fill="#607556"
          >
            {p.behaviorId === "bistable"
              ? "IMPULSE"
              : p.behaviorId === "staircase"
                ? "STAIR"
                : "TIME"}
          </text>
        </>
      )}
      {p.visualId === "power-supply" && (
        <>
          <rect x={2} y={16} width={w - 4} height={h - 32} fill="#fdfcf5" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M${5 + i * 7} 8v6M${5 + i * 7} ${h - 14}v6`}
              stroke="#b2baa6"
              strokeWidth={1.3}
            />
          ))}
          <rect
            x={3}
            y={24}
            width={w - 6}
            height={33}
            fill="#e8ede1"
            stroke="#c3cbbb"
            strokeWidth={0.4}
          />
          <text
            x={w / 2}
            y={34}
            textAnchor="middle"
            fontSize={5}
            fontWeight="bold"
            fill="#ba5244"
          >
            MEAN WELL
          </text>
          <text
            x={w / 2}
            y={43}
            textAnchor="middle"
            fontSize={4}
            fill="#4e5b46"
          >
            HDR-60-24
          </text>
          <text
            x={w / 2}
            y={50}
            textAnchor="middle"
            fontSize={3.8}
            fill="#74806a"
          >
            24 V ⎓ 2.5 A
          </text>
          <circle
            cx={9}
            cy={66}
            r={2}
            fill={s?.powered ? "#71a34e" : "#acb59d"}
          />
          <text x={14} y={67} fontSize={3.5} fill="#627653">
            DC OK
          </text>
        </>
      )}
      {p.visualId === "terminal" && (
        <>
          <rect
            x={3}
            y={6}
            width={w - 6}
            height={15}
            rx={2}
            fill={d.productId.includes("pe") ? "#7aaa56" : "#6d9db5"}
          />
          {[8, 24, 40, 56, 72].map((x) => (
            <Screw key={x} x={x} y={14} />
          ))}
          <text
            x={w / 2}
            y={h - 3}
            textAnchor="middle"
            fontSize={3}
            fill="#e4f0d8"
          >
            {d.productId.includes("pe")
              ? "PE"
              : d.designation.startsWith("XL")
                ? "L"
                : "WSPÓLNY POTENCJAŁ"}
          </text>
        </>
      )}
      {p.visualId === "bulkhead" && (
        <g data-load-state={on ? "working" : "idle"}>
          {on && (
            <ellipse
              cx={w / 2}
              cy={h / 2 - 5}
              rx={w / 2 + 5}
              ry={h / 2}
              fill="#ffe878"
              opacity={0.18}
            />
          )}
          <rect
            data-device-body={d.designation}
            x={1}
            y={1}
            width={w - 2}
            height={h - 7}
            rx={w / 2 - 1}
            fill="#b5bbb0"
            stroke="#8b9688"
            strokeWidth={1}
          />
          <rect
            x={5}
            y={5}
            width={w - 10}
            height={h - 15}
            rx={w / 2 - 5}
            fill={on ? "#fff2ad" : "#d9dfd3"}
            stroke="#f3f5e9"
            strokeWidth={1}
          />
          <path
            d={`M${w / 2} 9v${h - 25}`}
            stroke={on ? "#ffd865" : "#b4bdae"}
            strokeWidth={9}
            strokeLinecap="round"
          />
          {[17, 31, 45, 59, 73].map((y) => (
            <path
              key={y}
              d={`M5 ${y}h${w - 10}`}
              stroke="#929e8a"
              strokeWidth={1.7}
            />
          ))}
          <path
            d={`M14 7v${h - 19}M${w - 14} 7v${h - 19}`}
            stroke="#8b9884"
            strokeWidth={1.5}
          />
          <text
            x={w / 2}
            y={h - 9}
            textAnchor="middle"
            fontSize={3.2}
            fill="#52634c"
          >
            {d.settings.powerW ?? 40} W · PE
          </text>
        </g>
      )}
      {p.visualId === "indicator" && (
        <g data-indicator-state={on ? "lit" : "off"}>
          <rect
            x={3}
            y={19}
            width={w - 6}
            height={43}
            rx={1.5}
            fill="#eceee6"
            stroke="#c4cbc0"
            strokeWidth={0.5}
          />
          {on && (
            <circle cx={w / 2} cy={34} r={10} fill="#68ec53" opacity={0.23} />
          )}
          <circle
            cx={w / 2}
            cy={34}
            r={5.3}
            fill={on ? "#80fb54" : "#305c38"}
            stroke="#536b50"
            strokeWidth={0.8}
          />
          <circle
            cx={w / 2 - 1.2}
            cy={32.5}
            r={1.6}
            fill={on ? "#e8ffb0" : "#749379"}
          />
          <text
            x={w / 2}
            y={51}
            textAnchor="middle"
            fontSize={6}
            fill="#526450"
          >
            {d.designation}
          </text>
          <text
            x={w / 2}
            y={58}
            textAnchor="middle"
            fontSize={2.7}
            fill="#778573"
          >
            {d.settings.voltageV ?? 230} V ~
          </text>
          <title>
            {d.designation}: {on ? "świeci" : "wyłączona"} · model dydaktyczny
          </title>
        </g>
      )}
      {["splice", "phase-distribution"].includes(p.visualId) && (
        <g>
          <rect
            x={2}
            y={3}
            width={w - 4}
            height={h - 6}
            rx={1.3}
            fill={p.visualId === "phase-distribution" ? "#98775a" : "#d4d7ce"}
          />
          {p.topology.terminals.map((t) => (
            <rect
              key={t.id}
              x={t.x - 2.2}
              y={h / 2 - 3}
              width={4.4}
              height={6}
              rx={0.8}
              fill={p.visualId === "phase-distribution" ? "#624d3e" : "#ed9954"}
            />
          ))}
          <text
            x={w / 2}
            y={h / 2 + 1}
            textAnchor="middle"
            fontSize={2.6}
            fill="#414b3b"
          >
            {p.visualId === "phase-distribution" ? "L" : "↔"}
          </text>
          <title>
            {d.designation} · zaciski zwarte wewnętrznie, niezależne od
            sąsiednich złączek
          </title>
        </g>
      )}
      {p.visualId === "socket" && (
        <>
          <circle
            cx={w / 2}
            cy={35}
            r={28}
            fill="#fdfcf5"
            stroke="#b7c0b0"
            strokeWidth={0.7}
          />
          <circle cx={30} cy={36} r={4} fill="#4c5947" />
          <circle cx={66} cy={36} r={4} fill="#4c5947" />
          <circle cx={48} cy={20} r={2.5} fill="#b4bab2" />
          <text
            x={w / 2}
            y={63}
            textAnchor="middle"
            fontSize={3}
            fill="#667560"
          >
            NAKŁADKA ZACISKOWA
          </text>
        </>
      )}
      {!thumbnail && ["load", "motor"].includes(p.behaviorId) && (
        <g data-load-state={on ? "working" : "idle"}>
          <title>
            {d.designation} —{" "}
            {on
              ? p.visualId === "lamp"
                ? "ŚWIECI"
                : p.visualId === "heater"
                  ? "GRZEJE"
                  : `PRACA ${s?.direction === "132" ? "↺" : "↻"}`
              : "WYŁĄCZONY"}
          </title>
        </g>
      )}
      {!thumbnail && s?.tripped && (
        <g>
          <rect
            x={-3}
            y={h + 12}
            width={w + 6}
            height={9}
            rx={2}
            fill="#b6644c"
          />
          <text
            x={w / 2}
            y={h + 18}
            textAnchor="middle"
            fontSize={3.8}
            fill="#fff"
          >
            WYZWOLONY
          </text>
        </g>
      )}
      {showTerminals &&
        !thumbnail &&
        p.topology.terminals.map((t) => {
          const ref = { deviceId: d.id, terminalId: t.id },
            key = `${d.id}:${t.id}`,
            color = highlighted?.includes(key)
              ? "#d18a28"
              : red === key
                ? "#c55044"
                : black === key
                  ? "#303d35"
                  : wireStart === key
                    ? "#cc8738"
                    : "#4d6855";
          return (
            <g
              key={t.id}
              role="button"
              tabIndex={onTerminal ? 0 : undefined}
              aria-label={`${d.designation} / ${t.label} — ${t.role}`}
              className="terminal-control"
              onPointerDown={stop}
              onClick={(e) => {
                e.stopPropagation();
                onTerminal?.(ref);
              }}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onTerminal?.(ref);
                }
              }}
              data-terminal={`${d.designation}:${t.id}`}
            >
              <title>
                {d.designation} / {t.label} — {t.role}
                {!t.printed ? " · identyfikator punktu w aplikacji" : ""}
              </title>
              <circle
                cx={t.x}
                cy={t.y}
                r={Math.min(
                  Math.max(3.5, 12 / (MM * zoom)),
                  ...p.topology.terminals
                    .filter((other) => other.id !== t.id)
                    .map(
                      (other) =>
                        Math.hypot(other.x - t.x, other.y - t.y) * 0.45,
                    ),
                )}
                fill="transparent"
              />
              <circle
                cx={t.x}
                cy={t.y}
                r={2.3}
                fill={
                  red === key || black === key || wireStart === key
                    ? color
                    : "#edf0df"
                }
                stroke={color}
                strokeWidth={highlighted?.includes(key) ? 1.3 : 0.7}
              />
              <circle cx={t.x} cy={t.y} r={0.8} fill={color} />
              <text
                x={t.x}
                y={t.y + (t.y > h / 2 ? 7 : -4.5)}
                textAnchor="middle"
                fontSize={3.8}
                fontWeight={500}
                fill={
                  p.visualId === "tesys-contactor" && t.y > 0 && t.y < h
                    ? "#e1e9dc"
                    : "#415440"
                }
              >
                {t.label}
              </text>
              {(red === key || black === key) && (
                <path
                  d={`M${t.x} ${t.y + 2}v8`}
                  stroke={color}
                  strokeWidth={1.4}
                />
              )}
            </g>
          );
        })}
    </g>
  );
}
export const DevicePhysical = memo(Physical);
export function schematicConnections(
  p: Product,
): Array<Omit<InternalConnection, "kind"> & { kind: string }> {
  const connections = [...p.topology.connections];
  if (p.behaviorId.startsWith("source-")) {
    const phases =
      p.behaviorId === "source-3ph"
        ? ["L1", "L2", "L3"]
        : p.behaviorId === "source-dc"
          ? ["+"]
          : ["L"];
    return [
      ...phases.map((t, i) => ({
        id: `src${i}`,
        from: t,
        to: p.behaviorId === "source-dc" ? "-" : "N",
        kind: "source",
      })),
      ...connections,
    ];
  }
  if (p.behaviorId === "power-supply")
    return [
      ...connections,
      {
        id: "output",
        from: p.topology.output!.plus,
        to: p.topology.output!.minus,
        kind: "source",
      },
    ];
  return connections;
}
export function schematicGeometry(p: Product): {
  width: number;
  height: number;
  ports: Record<string, { x: number; y: number }>;
} {
  const rows = schematicConnections(p),
    ports: Record<string, { x: number; y: number }> = {};
  rows.forEach((cn, i) => {
    if (!ports[cn.from]) ports[cn.from] = { x: 16, y: 40 + i * 45 };
    if (!ports[cn.to]) ports[cn.to] = { x: 144, y: 40 + i * 45 };
  });
  p.topology.terminals.forEach((t, i) => {
    ports[t.id] ??= { x: 16 + (i % 4) * 42, y: rows.length * 45 + 45 };
  });
  return { width: 160, height: Math.max(90, rows.length * 45 + 75), ports };
}
export function DeviceSchematic({
  product: p,
  device: d,
  state: s,
  selected,
  showTerminals = true,
  onTerminal,
  red,
  black,
  highlighted,
}: DeviceProps) {
  const geo = schematicGeometry(p),
    rows = schematicConnections(p);
  return (
    <g
      className="schematic-vector"
      data-device={d.designation}
      data-powered={s?.powered ? "true" : "false"}
    >
      {["load", "motor"].includes(p.behaviorId) && (
        <g data-load-state={s?.powered ? "working" : "idle"}>
          <circle
            cx={103}
            cy={-20}
            r={3}
            fill={s?.powered ? "#44855f" : "#a1ad96"}
          />
          <text
            x={111}
            y={-16}
            fontSize={10}
            fontWeight={600}
            fill={s?.powered ? "#35714f" : "#7d8a70"}
          >
            {s?.powered ? "PRACA" : "OFF"}
          </text>
        </g>
      )}
      {selected && (
        <rect
          x={-6}
          y={-8}
          width={172}
          height={geo.height + 8}
          fill="#edf6eb"
          opacity={0.55}
          rx={3}
        />
      )}
      <text
        x={80}
        y={9}
        textAnchor="middle"
        fontSize={14}
        fill="#3e5040"
        fontWeight={600}
      >
        {d.designation}
      </text>
      {rows.map((cn, i) => {
        const y = 40 + i * 45;
        const nc =
          cn.condition === "mechanism-inverse" ||
          cn.condition === "manual-inverse" ||
          cn.condition === "stop-inverse" ||
          cn.condition === "healthy";
        return (
          <g key={cn.id}>
            <path
              d={`M16 ${y}H61m38 0h45`}
              fill="none"
              stroke="#536254"
              strokeWidth={1.5}
            />
            {cn.kind === "contact" ? (
              <>
                <circle cx={64} cy={y} r={2.5} fill="#fff" stroke="#536254" />
                <circle cx={97} cy={y} r={2.5} fill="#fff" stroke="#536254" />
                <path
                  d={`M64 ${y}L97 ${nc ? y : y - 14}`}
                  stroke="#536254"
                  strokeWidth={1.5}
                />
                {nc && <path d={`M87 ${y - 7}v14`} stroke="#536254" />}
              </>
            ) : cn.kind === "coil" || cn.kind === "electronics" ? (
              <rect
                x={61}
                y={y - 10}
                width={38}
                height={20}
                fill="#fafcf6"
                stroke="#536254"
                strokeWidth={1.5}
              />
            ) : cn.kind === "load" ? (
              ["lamp", "bulkhead", "indicator"].includes(p.visualId) ? (
                <>
                  <circle
                    cx={80}
                    cy={y}
                    r={18}
                    fill="#fafcf6"
                    stroke="#536254"
                    strokeWidth={1.5}
                  />
                  <path
                    d={`M67 ${y - 13}l26 26m0-26l-26 26`}
                    stroke="#536254"
                    strokeWidth={1.5}
                  />
                </>
              ) : p.visualId === "fan" ? (
                <>
                  <circle
                    cx={80}
                    cy={y}
                    r={18}
                    fill="#fafcf6"
                    stroke="#536254"
                    strokeWidth={1.5}
                  />
                  <text
                    x={80}
                    y={y + 5}
                    textAnchor="middle"
                    fontSize={15}
                    fill="#536254"
                  >
                    M
                  </text>
                </>
              ) : (
                <rect
                  x={61}
                  y={y - 8}
                  width={38}
                  height={16}
                  fill="#fafcf6"
                  stroke="#536254"
                  strokeWidth={1.5}
                />
              )
            ) : cn.kind === "source" ? (
              <>
                <circle
                  cx={80}
                  cy={y}
                  r={17}
                  fill="#fafcf6"
                  stroke="#536254"
                  strokeWidth={1.5}
                />
                <text
                  x={80}
                  y={y + 5}
                  textAnchor="middle"
                  fontSize={18}
                  fill="#536254"
                >
                  {p.behaviorId === "source-dc" || cn.id === "output"
                    ? "⎓"
                    : "~"}
                </text>
              </>
            ) : (
              <path d={`M61 ${y}h38`} stroke="#536254" strokeWidth={1.5} />
            )}
            <text x={26} y={y - 6} fontSize={10} fill="#69765c">
              {cn.from}
            </text>
            <text
              x={133}
              y={y - 6}
              textAnchor="end"
              fontSize={10}
              fill="#69765c"
            >
              {cn.to}
            </text>
            {rows.length > 1 && (
              <text
                x={80}
                y={y + 25}
                textAnchor="middle"
                fontSize={9}
                fill="#8a967d"
              >
                {d.designation} · {cn.kind === "coil" ? "cewka" : cn.id}
              </text>
            )}
          </g>
        );
      })}
      {showTerminals &&
        p.topology.terminals.map((t) => {
          const at = geo.ports[t.id],
            ref = { deviceId: d.id, terminalId: t.id },
            key = `${d.id}:${t.id}`;
          return (
            <g
              key={t.id}
              role="button"
              tabIndex={0}
              aria-label={`${d.designation} / ${t.label} — ${t.role}`}
              data-terminal={`${d.designation}:${t.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onTerminal?.(ref);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTerminal?.(ref);
                }
              }}
              className="terminal-control"
            >
              <title>
                {d.designation}/{t.id} — {t.role}
              </title>
              <circle cx={at.x} cy={at.y} r={12} fill="transparent" />
              <circle
                cx={at.x}
                cy={at.y}
                r={3.5}
                fill={
                  highlighted?.includes(key)
                    ? "#d18a28"
                    : red === key
                      ? "#bc4d45"
                      : black === key
                        ? "#2c3f30"
                        : "#fbfcf7"
                }
                stroke="#557350"
                strokeWidth={1.3}
              />
            </g>
          );
        })}
      <text
        x={80}
        y={geo.height - 8}
        textAnchor="middle"
        fontSize={9}
        fill="#889779"
      >
        {p.manufacturerPartNumber || p.behaviorId}
      </text>
    </g>
  );
}
export function DeviceThumbnail({
  product: p,
  state,
}: {
  product: Product;
  state?: DeviceRuntime;
}) {
  const dim = p.dimensions.value;
  if (!dim)
    return <div className="pending-thumb">{p.manufacturer.slice(0, 1)}</div>;
  const d: DeviceInstance = {
    id: "thumb",
    productId: p.id,
    productRevision: p.revision,
    designation: "",
    settings: p.defaults,
  };
  return (
    <svg
      viewBox={`-5 -5 ${(dim.width + 10) * MM} ${(dim.height + 10) * MM}`}
      aria-hidden="true"
      className="product-thumbnail"
    >
      <DevicePhysical
        product={p}
        device={d}
        state={state}
        thumbnail
        showTerminals={false}
      />
    </svg>
  );
}
