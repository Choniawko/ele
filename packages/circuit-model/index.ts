import { z } from "zod";

export type TerminalRef = { deviceId: string; terminalId: string };
export const terminalKey = (ref: TerminalRef) =>
  `${ref.deviceId}:${ref.terminalId}`;
export type SupplyKind = "AC" | "DC";
export type Role =
  | "L1"
  | "L2"
  | "L3"
  | "N"
  | "PE"
  | "CONTROL"
  | "DC_PLUS"
  | "DC_MINUS"
  | "UNSPECIFIED";
export type DeviceSettings = {
  position?: boolean;
  powerW?: number;
  voltageV?: number;
  resistanceOhm?: number;
  timeS?: number;
  timerMode?: "A" | "B" | "C" | "D";
  ratedCurrentA?: number;
  sourceResistanceOhm?: number;
  independentSupply?: boolean;
  phaseOrder?: "123" | "132";
  loadFactor?: number;
};
export interface DeviceInstance {
  id: string;
  productId: string;
  productRevision: string;
  designation: string;
  settings: DeviceSettings;
  assemblyId?: string;
}
export interface Conductor {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
  declaredRole: Role;
  insulationColor: string;
  crossSectionMm2: number;
  electricalLengthM: number;
  material: "Cu" | "Al";
  marking: string;
  cableId?: string;
}
export interface Bridge {
  id: string;
  from: TerminalRef;
  to: TerminalRef;
}
export type FaultKind =
  | "open-wire"
  | "loose-terminal"
  | "short-circuit"
  | "leakage"
  | "insulation"
  | "welded-contact"
  | "open-coil"
  | "blocked-mechanism"
  | "phase-loss"
  | "rcd-failure";
export interface Fault {
  id: string;
  kind: FaultKind;
  targetId: string;
  from?: TerminalRef;
  to?: TerminalRef;
  resistanceOhm?: number;
  hidden: boolean;
  activeAtMs: number;
}
export interface CircuitModel {
  schemaVersion: 1;
  projectId: string;
  revision: number;
  catalogSnapshotId: string;
  devices: DeviceInstance[];
  conductors: Conductor[];
  bridges: Bridge[];
  cables: { id: string; designation: string; coreIds: string[] }[];
  mechanicalCouplings: {
    id: string;
    deviceIds: string[];
    kind: "assembly" | "interlock";
  }[];
  supplySystems: {
    id: string;
    kind: "TN-S" | "isolated-DC";
    sourceId: string;
  }[];
  installationConditions: {
    temperatureC: number;
    copperResistivity: number;
    aluminiumResistivity: number;
    insulationResistanceOhm: number;
  };
}
export type Point = { x: number; y: number };
export interface MountingRail {
  id: string;
  x: number;
  y: number;
  width: number;
}
export interface Layout {
  devices: Record<string, Point>;
  routes: Record<string, Point[]>;
  rails?: MountingRail[];
}
export interface TrainingSession {
  scenarioId: string;
  hintLevel: number;
  observations: string[];
  completedChecks: string[];
  diagnosis?: string;
  repaired: boolean;
}
export interface ProjectDocument {
  name: string;
  circuit: CircuitModel;
  physical: Layout;
  schematic: Layout;
  faults: Fault[];
  scenarioId?: string;
  training?: TrainingSession;
  userMetadata: Record<string, string>;
  productRevisions: Record<string, string>;
}
const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_.:/+-]+$/);
const ref = z.object({ deviceId: id, terminalId: id }).strict();
const point = z.object({
  x: z.number().finite().min(-10000).max(10000),
  y: z.number().finite().min(-10000).max(10000),
});
export const settingsSchema = z
  .object({
    position: z.boolean().optional(),
    powerW: z.number().min(0.01).max(100000).optional(),
    voltageV: z.number().min(0.01).max(1000).optional(),
    resistanceOhm: z.number().positive().max(1e12).optional(),
    timeS: z.number().min(0.1).max(2073600).optional(),
    timerMode: z.enum(["A", "B", "C", "D"]).optional(),
    ratedCurrentA: z.number().positive().max(1000).optional(),
    sourceResistanceOhm: z.number().min(0).max(100).optional(),
    independentSupply: z.boolean().optional(),
    phaseOrder: z.enum(["123", "132"]).optional(),
    loadFactor: z.number().min(0.1).max(5).optional(),
  })
  .strict();
const layout = z.object({
  devices: z.record(id, point),
  routes: z.record(id, z.array(point).max(100)),
  rails: z
    .array(
      z
        .object({
          id,
          x: point.shape.x,
          y: point.shape.y,
          width: z.number().finite().min(100).max(5000),
        })
        .strict(),
    )
    .min(1)
    .max(24)
    .refine(
      (rails) => new Set(rails.map((rail) => rail.id)).size === rails.length,
      "Identyfikatory szyn muszą być unikalne.",
    )
    .optional(),
});
export const projectSchema = z
  .object({
    name: z.string().min(1).max(120),
    circuit: z
      .object({
        schemaVersion: z.literal(1),
        projectId: id,
        revision: z.number().int().nonnegative(),
        catalogSnapshotId: id,
        devices: z
          .array(
            z
              .object({
                id,
                productId: id,
                productRevision: id,
                designation: z.string().min(1).max(30),
                settings: settingsSchema,
                assemblyId: id.optional(),
              })
              .strict(),
          )
          .max(150),
        conductors: z
          .array(
            z
              .object({
                id,
                from: ref,
                to: ref,
                declaredRole: z.enum([
                  "L1",
                  "L2",
                  "L3",
                  "N",
                  "PE",
                  "CONTROL",
                  "DC_PLUS",
                  "DC_MINUS",
                  "UNSPECIFIED",
                ]),
                insulationColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
                crossSectionMm2: z.number().min(0.14).max(240),
                electricalLengthM: z.number().min(0.001).max(10000),
                material: z.enum(["Cu", "Al"]),
                marking: z.string().max(30),
                cableId: id.optional(),
              })
              .strict(),
          )
          .max(500),
        bridges: z.array(z.object({ id, from: ref, to: ref })).max(500),
        cables: z
          .array(
            z.object({
              id,
              designation: z.string().max(30),
              coreIds: z.array(id).max(5),
            }),
          )
          .max(100),
        mechanicalCouplings: z
          .array(
            z.object({
              id,
              deviceIds: z.array(id).min(2).max(10),
              kind: z.enum(["assembly", "interlock"]),
            }),
          )
          .max(100),
        supplySystems: z
          .array(
            z.object({
              id,
              kind: z.enum(["TN-S", "isolated-DC"]),
              sourceId: id,
            }),
          )
          .max(20),
        installationConditions: z.object({
          temperatureC: z.number().min(-50).max(150),
          copperResistivity: z.number().positive().max(1),
          aluminiumResistivity: z.number().positive().max(1),
          insulationResistanceOhm: z.number().min(1000).max(1e12),
        }),
      })
      .strict(),
    physical: layout,
    schematic: layout,
    faults: z
      .array(
        z.object({
          id,
          kind: z.enum([
            "open-wire",
            "loose-terminal",
            "short-circuit",
            "leakage",
            "insulation",
            "welded-contact",
            "open-coil",
            "blocked-mechanism",
            "phase-loss",
            "rcd-failure",
          ]),
          targetId: id,
          from: ref.optional(),
          to: ref.optional(),
          resistanceOhm: z.number().positive().max(1e12).optional(),
          hidden: z.boolean(),
          activeAtMs: z.number().nonnegative(),
        }),
      )
      .max(100),
    scenarioId: id.optional(),
    training: z
      .object({
        scenarioId: id,
        hintLevel: z.number().int().min(0).max(4),
        observations: z.array(z.string().max(1000)).max(100),
        completedChecks: z.array(id).max(100),
        diagnosis: z.string().max(1000).optional(),
        repaired: z.boolean(),
      })
      .optional(),
    userMetadata: z.record(z.string().max(100), z.string().max(2000)),
    productRevisions: z.record(id, id),
  })
  .strict();
export function emptyProject(name = "Moja instalacja"): ProjectDocument {
  return {
    name,
    circuit: {
      schemaVersion: 1,
      projectId: `project-${crypto.randomUUID()}`,
      revision: 0,
      catalogSnapshotId: "catalog-2026-10-02",
      devices: [],
      conductors: [],
      bridges: [],
      cables: [],
      mechanicalCouplings: [],
      supplySystems: [],
      installationConditions: {
        temperatureC: 20,
        copperResistivity: 0.0175,
        aluminiumResistivity: 0.0282,
        insulationResistanceOhm: 200e6,
      },
    },
    physical: { devices: {}, routes: {} },
    schematic: { devices: {}, routes: {} },
    faults: [],
    userMetadata: {},
    productRevisions: {},
  };
}
export const clone = <T>(value: T): T => structuredClone(value);
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
export function conductorResistance(
  w: Conductor,
  conditions: CircuitModel["installationConditions"],
): number {
  const rho =
    w.material === "Cu"
      ? conditions.copperResistivity
      : conditions.aluminiumResistivity;
  return (
    (rho *
      (1 + 0.00393 * (conditions.temperatureC - 20)) *
      w.electricalLengthM) /
    w.crossSectionMm2
  );
}
