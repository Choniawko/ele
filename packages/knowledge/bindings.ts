import { catalog } from "@catalog/index";
import type { DeviceInstance, ProjectDocument } from "@model/index";
import { mechanismOwner } from "@simulation/mechanisms";
import snapshot from "./binding-snapshot.json";
import type {
  KnowledgeContext,
  KnowledgeResolution,
  ProductKnowledgeBinding,
  TheoryFallback,
} from "./types";
export const theoryFallback: TheoryFallback = {
  switch: "laczniki",
  changeover: "laczniki",
  crossover: "laczniki",
  "push-no": "laczniki",
  "push-nc": "laczniki",
  "push-multi": "laczniki",
  "push-start-stop": "laczniki",
  contactor: "stycznik",
  auxiliary: "blok-pomocniczy",
  relay: "przekaznik",
  bistable: "bistabilny",
  timer: "czasowe",
  staircase: "czasowe",
  mcb: "mcb",
  rccb: "rcd",
  rcbo: "rcd",
  thermal: "zabezpieczenia-silnikowe",
  "motor-protection": "zabezpieczenia-silnikowe",
  connector: "zlaczki",
  "power-supply": "zasilacze",
  motor: "silnik",
  "source-ac": "zasilacze",
  "source-dc": "zasilacze",
  "source-3ph": "zasilacze",
  socket: "gniazda",
};
const loadTheory: Record<string, string> = {
  "edu-lamp": "lampy",
  "edu-bulkhead-40": "lampy",
  "edu-indicator-green-230": "lampy",
  "edu-heater": "grzalka",
  "edu-fan": "wentylator",
};
export const bindings: ProductKnowledgeBinding[] =
  snapshot as unknown as ProductKnowledgeBinding[];
export function resolveKnowledge(
  productId: string,
  terminalId?: string,
  fragmentId?: string,
): KnowledgeResolution | undefined {
  const p = catalog[productId];
  if (!p) return;
  const b = bindings.find(
    (b) =>
      b.productId === p.id &&
      b.productRevision === p.revision &&
      b.topologyRevision === p.topology.revision,
  );
  if (!b) {
    const articleId = loadTheory[p.id] ?? theoryFallback[p.behaviorId];
    return articleId
      ? {
          articleId,
          exact: false,
          explanation: p.educational
            ? "Teoria modelu dydaktycznego — brak zweryfikowanej mapy realnego SKU."
            : "Teoria ogólna — brak zweryfikowanego powiązania tej rewizji produktu.",
        }
      : undefined;
  }
  const map = fragmentId
    ? b.fragments[fragmentId]
    : terminalId
      ? b.terminals[terminalId]
      : undefined;
  if ((terminalId || fragmentId) && !map)
    return {
      articleId: b.articleId,
      exact: false,
      explanation:
        "Brak mapy wskazanego fragmentu lub zacisku. Dostępna jest teoria ogólna.",
    };
  return {
    articleId: b.articleId,
    exact: true,
    explanation: map?.explanation,
    sectionId: map?.sectionId,
    terminalIds: fragmentId
      ? b.fragments[fragmentId]?.terminalIds
      : terminalId
        ? [terminalId]
        : undefined,
  };
}
export function validContext(
  p: ProjectDocument,
  c: KnowledgeContext | null,
): DeviceInstance | undefined {
  if (
    !c ||
    p.circuit.projectId !== c.projectId ||
    p.circuit.revision !== c.revision
  )
    return;
  const d = p.circuit.devices.find(
    (d) =>
      d.id === c.deviceId &&
      d.productId === c.productId &&
      d.productRevision === c.productRevision,
  );
  if (!d) return;
  return resolveKnowledge(d.productId, c.terminalId, c.fragmentId)?.exact
    ? d
    : undefined;
}
export function contextExplanation(p: ProjectDocument, c: KnowledgeContext) {
  const d = validContext(p, c);
  if (!d && p.circuit.projectId === c.projectId && p.circuit.revision === c.revision &&
    p.circuit.devices.some(d => d.id === c.deviceId && d.productId === c.productId && d.productRevision === c.productRevision))
    return `${c.deviceId} · ${resolveKnowledge(c.productId)?.explanation ?? "Teoria ogólna"} Powrót zachowa projekt; zaznaczanie zacisków wymaga zweryfikowanej mapy.`;
  if (!d)
    return "Kontekst jest nieaktualny. Czytasz teorię ogólną; zaznaczenie w projekcie jest wyłączone.";
  const owner = mechanismOwner(p, d.id);
  const parent =
    owner && owner !== d.id
      ? p.circuit.devices.find((x) => x.id === owner)
      : undefined;
  return `${d.designation} · ${catalog[d.productId].displayNamePl}${c.terminalId ? ` · zacisk ${c.terminalId}` : ""}${c.fragmentId ? ` · fragment ${c.fragmentId}` : ""}${parent ? ` · mechanizm rodzica ${parent.designation}` : ""}. ${resolveKnowledge(d.productId, c.terminalId, c.fragmentId)?.explanation ?? "Rola w Twoim układzie zależy od jego połączeń."}`;
}
