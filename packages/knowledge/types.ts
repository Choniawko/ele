import type { BehaviorId } from "@catalog/index";
import type { Point, TerminalRef } from "@model/index";
export type Qualification = "ELE.02" | "ELE.05";
export type ContentKind = "article" | "lesson" | "circuit";
export interface KnowledgeSource {
  id: string;
  title: string;
  url: string;
  locator: string;
  verifiedAt: string;
}
export interface Section {
  id: string;
  title: string;
  paragraphs: string[];
  sourceIds: string[];
}
export interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string;
  synonyms: string[];
  qualifications: Qualification[];
  level: "Podstawy" | "Średni";
  status: "published";
  sections: Section[];
  sources: KnowledgeSource[];
  related: string[];
  exampleId?: string;
  illustrationProductId: string;
}
export interface ProductKnowledgeBinding {
  productId: string;
  productRevision: string;
  topologyRevision: string;
  articleId: string;
  terminals: Record<string, { sectionId: string; explanation: string }>;
  fragments: Record<
    string,
    { sectionId: string; explanation: string; terminalIds: string[] }
  >;
}
export interface KnowledgeContext {
  projectId: string;
  revision: number;
  deviceId: string;
  productId: string;
  productRevision: string;
  terminalId?: string;
  fragmentId?: string;
  returnTo: string;
  view: "physical" | "schematic" | "split";
  selection: string[];
  cameras: Partial<
    Record<"physical" | "schematic", { scale: number; x: number; y: number }>
  >;
}
export interface SymbolPlacement {
  designation: string;
  fragmentId: string;
  reverse?: boolean;
  x: number;
  y: number;
  label: string;
}
export interface PortPlacement {
  designation: string;
  terminalId: string;
  x: number;
  y: number;
  label: string;
}
export interface CircuitLesson {
  id: string;
  slug: string;
  title: string;
  kind: "lesson" | "circuit";
  summary: string;
  qualifications: Qualification[];
  level: "Podstawy" | "Średni";
  exampleId: string;
  goal: string;
  initial: string;
  prediction: string;
  explanation: string;
  related: string[];
  sources: KnowledgeSource[];
}
export interface CoverageEntry {
  id: string;
  title: string;
  qualifications: Qualification[];
  tags: string[];
  contentStatus: "published" | "planned";
  practiceStatus: "interactive" | "theory-only" | "unavailable";
  contentIds: string[];
  sourceId: string;
  locator: string;
}
export interface LearningProgress {
  version: 1;
  read: Record<string, string>;
}
export interface KnowledgeResolution {
  articleId: string;
  exact: boolean;
  explanation?: string;
  sectionId?: string;
  terminalIds?: string[];
}
export type TheoryFallback = Partial<Record<BehaviorId, string>>;
export interface Highlight {
  terminals: TerminalRef[];
  deviceIds: string[];
  wireId?: string;
}
export type DiagramScope = {
  title: string;
  width: number;
  height: number;
  symbols: SymbolPlacement[];
  ports: PortPlacement[];
  netAnchors?: { designation: string; terminalId: string; point: Point }[];
};
