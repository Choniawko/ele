import { create } from "zustand";
import { useApp } from "./store";
import { boundReferenceIdentity as boundReference } from "../../../packages/knowledge/reference-identity";
import type { TerminalRef } from "@model/index";

interface ReferenceContext {
  projectId: string;
  revision: number;
  deviceId?: string;
  terminalId?: string;
  symbolId?: string;
  wireId?: string;
  selection: string[];
  highlight: TerminalRef[];
  origin: HTMLElement | null;
}
export const useReferenceHelp = create<{ context: ReferenceContext | null }>(
  () => ({ context: null }),
);
export function openReferenceHelp(
  input: Pick<
    ReferenceContext,
    "deviceId" | "terminalId" | "symbolId" | "wireId"
  >,
) {
  const s = useApp.getState(),
    r = boundReference(s.project);
  if (
    !r ||
    (input.deviceId &&
      !r.bindings.some((b) => b.deviceId === input.deviceId)) ||
    (input.wireId &&
      !s.project.circuit.conductors.some((w) => w.id === input.wireId))
  )
    return false;
  const binding = r.bindings.find((b) => b.deviceId === input.deviceId);
  if (
    (input.terminalId && !binding?.terminalIds.includes(input.terminalId)) ||
    (input.symbolId && !binding?.symbolIds.includes(input.symbolId))
  )
    return false;
  const old = useReferenceHelp.getState().context;
  useReferenceHelp.setState({
    context: {
      ...input,
      projectId: s.project.circuit.projectId,
      revision: s.project.circuit.revision,
      selection: old?.selection ?? [...s.selection],
      highlight: old?.highlight ?? [...s.knowledgeHighlight],
      origin:
        old?.origin ??
        (document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null),
    },
  });
  return true;
}
export function closeReferenceHelp() {
  const c = useReferenceHelp.getState().context,
    s = useApp.getState();
  if (
    c &&
    s.project.circuit.projectId === c.projectId &&
    s.project.circuit.revision === c.revision
  )
    useApp.setState({
      selection: c.selection,
      knowledgeHighlight: c.highlight,
    });
  useReferenceHelp.setState({ context: null });
  if (c?.origin?.isConnected) c.origin.focus();
}
