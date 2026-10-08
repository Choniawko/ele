import { useEffect, useState, useRef } from "react";
import { useApp } from "./store";
import {
  resolveKnowledge,
  validContext,
} from "../../../packages/knowledge/bindings";
import type { KnowledgeContext } from "../../../packages/knowledge/types";
export const boardCameras: KnowledgeContext["cameras"] = {};
let originFocus: HTMLElement | null = null;
const key = "ele.knowledge.context.v1";
const productKey = "ele.knowledge.product.v1";
let currentContext: KnowledgeContext | null | undefined;
let currentProduct: string | null | undefined;
export function readProductSelection() {
  try {
    return sessionStorage.getItem(productKey);
  } catch {
    return currentProduct ?? null;
  }
}
export function readContext(): KnowledgeContext | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(key) ?? "null");
    return c &&
      typeof c.projectId === "string" &&
      typeof c.deviceId === "string" &&
      typeof c.revision === "number" &&
      typeof c.productId === "string" &&
      typeof c.productRevision === "string" &&
      ["physical", "schematic", "split"].includes(c.view) &&
      Array.isArray(c.selection)
      ? c
      : null;
  } catch {
    return currentContext ?? null;
  }
}
export async function openKnowledge(
  productId?: string,
  deviceId?: string,
  terminalId?: string,
  fragmentId?: string,
) {
  const s = useApp.getState();
  try {
    await s.flushSave();
  } catch {
    return;
  }
  originFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const d = s.project.circuit.devices.find((d) => d.id === deviceId);
  const context: KnowledgeContext | null = d
    ? {
        projectId: s.project.circuit.projectId,
        revision: s.project.circuit.revision,
        deviceId: d.id,
        productId: d.productId,
        productRevision: d.productRevision,
        terminalId,
        fragmentId,
        returnTo: "#workbench",
        view: s.view,
        selection: [...s.selection],
        cameras: structuredClone(boardCameras),
      }
    : null;
  currentContext = context;
  currentProduct = productId ?? null;
  try {
    if (productId) sessionStorage.setItem(productKey, productId);
    else sessionStorage.removeItem(productKey);
    if (context) sessionStorage.setItem(key, JSON.stringify(context));
    else sessionStorage.removeItem(key);
  } catch {
    /* Context stays optional when storage is unavailable. */
  }
  const resolution = productId
    ? resolveKnowledge(productId, terminalId, fragmentId)
    : undefined;
  location.hash = resolution
    ? `knowledge/article/${resolution.articleId}`
    : "knowledge";
}
export function returnToWorkbench(showDevice = false) {
  const c = readContext(),
    s = useApp.getState();
  if (c && s.project.circuit.projectId === c.projectId) {
    const d = validContext(s.project, c);
    useApp.setState({
      view: c.view,
      knowledgeHighlight:
        showDevice && d
          ? (
              resolveKnowledge(d.productId, c.terminalId, c.fragmentId)
                ?.terminalIds ?? []
            ).map((terminalId) => ({ deviceId: d.id, terminalId }))
          : [],
      selection:
        showDevice && d
          ? [d.id]
          : c.selection.filter(
              (id) =>
                s.project.circuit.devices.some((d) => d.id === id) ||
                s.project.circuit.conductors.some((w) => w.id === id),
            ),
    });
    window.dispatchEvent(
      new CustomEvent("ele:restore-cameras", { detail: c.cameras }),
    );
  }
  location.hash = "workbench";
}
export function restoreKnowledgeFocus() {
  if (originFocus?.isConnected) originFocus.focus();
  else
    document.querySelector<HTMLButtonElement>("[data-knowledge-nav]")?.focus();
}
const isKnowledgeHash = (hash: string) =>
  hash.startsWith("#knowledge") || /^#\/wiedza(?:\/|$)/.test(hash);
export function useKnowledgeRoute() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const listener = () => setHash(location.hash);
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  const previous = useRef(hash);
  useEffect(() => {
    if (isKnowledgeHash(previous.current) && !isKnowledgeHash(hash))
      restoreKnowledgeFocus();
    previous.current = hash;
  }, [hash]);
  if (hash.startsWith("#knowledge")) return hash.slice(1);
  if (/^#\/wiedza(?:\/|$)/.test(hash))
    return `knowledge/exam${hash.slice("#/wiedza".length)}`;
  return null;
}
