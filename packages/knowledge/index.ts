import { catalog, products } from "@catalog/index";
import { articles, lessons, circuits, coverage } from "./content";
import { examples, createDemo, deviceByName } from "./examples";
import { bindings, resolveKnowledge } from "./bindings";
import { sources } from "./sources";
import type { ContentKind, LearningProgress } from "./types";
export * from "./types";
export const normalizeSearch = (text: string) =>
  text
    .toLocaleLowerCase("pl")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function searchKnowledge(
  query: string,
  qualification = "",
  level = "",
  kind: ContentKind | "",
  section = "",
) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  return [
    ...articles.map((a) => ({ ...a, kind: "article" as const })),
    ...lessons,
    ...circuits,
  ].filter((item) => {
    if (
      qualification &&
      !item.qualifications.includes(qualification as "ELE.02" | "ELE.05")
    )
      return false;
    if ((level && item.level !== level) || (kind && item.kind !== kind))
      return false;
    if (section && section !== item.kind) return false;
    const synonyms = "synonyms" in item ? item.synonyms.join(" ") : "";
    const names = products
      .filter((p) => resolveKnowledge(p.id)?.articleId === item.id)
      .map((p) => `${p.displayNamePl} ${p.manufacturerPartNumber}`)
      .join(" ");
    const haystack = normalizeSearch(
      `${item.title} ${item.summary} ${synonyms} ${names}`,
    );
    return words.every((w) => haystack.includes(w));
  });
}
export function validateKnowledge() {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const all = [
    ...articles.map((a) => ({ ...a, kind: "article" })),
    ...lessons,
    ...circuits,
  ];
  for (const item of all) {
    if (!item.id.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug))
      errors.push(`ID lub slug ${item.id}`);
    if (ids.has(item.id)) errors.push(`Powtórzone ID ${item.id}`);
    ids.add(item.id);
    const slug = `${item.kind}/${item.slug}`;
    if (slugs.has(slug)) errors.push(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    if (!item.sources.length) errors.push(`Brak źródeł ${item.id}`);
    for (const source of item.sources)
      if (
        !source.locator ||
        !source.url.startsWith("https://") ||
        !/^\d{4}-\d{2}-\d{2}$/.test(source.verifiedAt)
      )
        errors.push(`Źródło ${item.id}/${source.id}`);
    for (const id of item.related)
      if (!articles.some((a) => a.id === id))
        errors.push(`Brak artykułu powiązanego ${id}`);
  }
  for (const a of articles) {
    if (a.status !== "published") errors.push(`Status ${a.id}`);
    const sections = new Set<string>();
    for (const section of a.sections) {
      if (sections.has(section.id) || !section.paragraphs.join("").trim())
        errors.push(`Sekcja ${a.id}/${section.id}`);
      sections.add(section.id);
      for (const id of section.sourceIds)
        if (!a.sources.some((s) => s.id === id))
          errors.push(`Źródło sekcji ${a.id}/${id}`);
    }
    if (!catalog[a.illustrationProductId]?.published)
      errors.push(`Ilustracja ${a.id}`);
    if (a.exampleId && !examples.some((e) => e.id === a.exampleId))
      errors.push(`Przykład ${a.id}`);
  }
  const products = new Set<string>();
  for (const b of bindings) {
    if (products.has(b.productId))
      errors.push(`Powtórzony binding ${b.productId}`);
    products.add(b.productId);
    const p = catalog[b.productId],
      a = articles.find((a) => a.id === b.articleId);
    if (!p || !a) {
      errors.push(`Binding ${b.productId}`);
      continue;
    }
    if (
      b.topologyRevision !== p.topology.revision ||
      b.productRevision !== p.revision
    )
      errors.push(`Rewizja bindingu ${b.productId}`);
    for (const [id, map] of Object.entries(b.terminals))
      if (
        !p.topology.terminals.some((t) => t.id === id) ||
        !a.sections.some((s) => s.id === map.sectionId)
      )
        errors.push(`Zacisk ${b.productId}/${id}`);
    for (const [id, map] of Object.entries(b.fragments)) {
      const connection = p.topology.connections.find((c) => c.id === id);
      if (
        !p.topology.connections.some((c) => c.id === id) ||
        !a.sections.some((s) => s.id === map.sectionId)
      )
        errors.push(`Fragment ${b.productId}/${id}`);
      for (const t of map.terminalIds)
        if (!p.topology.terminals.some((x) => x.id === t))
          errors.push(`Zacisk fragmentu ${b.productId}/${t}`);
      if (connection) {
        const expected = [connection.from, connection.to].filter((id) =>
          p.topology.terminals.some((t) => t.id === id),
        );
        if (
          map.terminalIds.length !== expected.length ||
          expected.some((id) => !map.terminalIds.includes(id))
        )
          errors.push(`Końce fragmentu ${b.productId}/${id}`);
      }
    }
  }
  const demoIds = new Set<string>();
  for (const e of examples) {
    if (demoIds.has(e.id)) errors.push(`Powtórzony przykład ${e.id}`);
    demoIds.add(e.id);
    try {
      const p = createDemo(e.id);
      for (const diagram of e.diagrams) {
        for (const symbol of diagram.symbols) {
          const d = deviceByName(p, symbol.designation);
          if (
            !catalog[d.productId].topology.connections.some(
              (c) => c.id === symbol.fragmentId,
            )
          )
            errors.push(
              `Symbol ${e.id}/${symbol.designation}/${symbol.fragmentId}`,
            );
        }
        for (const port of [...diagram.ports, ...(diagram.netAnchors ?? [])]) {
          const d = deviceByName(p, port.designation);
          if (
            !catalog[d.productId].topology.terminals.some(
              (t) => t.id === port.terminalId,
            )
          )
            errors.push(`Port ${e.id}/${port.designation}/${port.terminalId}`);
        }
      }
      for (const step of e.steps)
        if (step.action.type === "operate")
          deviceByName(p, step.action.designation);
      for (const name of e.observe) deviceByName(p, name);
    } catch (error) {
      errors.push(`${e.id}: ${String(error)}`);
    }
  }
  for (const l of [...lessons, ...circuits]) {
    if (!demoIds.has(l.exampleId)) errors.push(`Przykład lekcji ${l.id}`);
    if (
      ![l.goal, l.initial, l.prediction, l.explanation].every((s) => s.trim())
    )
      errors.push(`Treść lekcji ${l.id}`);
  }
  const coverageIds = new Set<string>();
  for (const entry of coverage) {
    if (coverageIds.has(entry.id))
      errors.push(`Powtórzone pokrycie ${entry.id}`);
    coverageIds.add(entry.id);
    if (
      !["published", "planned"].includes(entry.contentStatus) ||
      !["interactive", "theory-only", "unavailable"].includes(
        entry.practiceStatus,
      )
    )
      errors.push(`Status pokrycia ${entry.id}`);
    if (entry.contentStatus === "planned" && entry.contentIds.length)
      errors.push(`Plan ${entry.id}`);
    for (const id of entry.contentIds)
      if (!ids.has(id)) errors.push(`Pokrycie ${id}`);
    if (
      !Object.values(sources).some((s) => s.id === entry.sourceId) ||
      !entry.locator
    )
      errors.push(`Źródło pokrycia ${entry.id}`);
  }
  return errors;
}
export const progressKey = "ele.knowledge.progress.v1";
export function readProgress(): LearningProgress {
  try {
    const data = JSON.parse(localStorage.getItem(progressKey) ?? "null");
    if (data?.version === 1 && data.read && typeof data.read === "object")
      return {
        version: 1,
        read: Object.fromEntries(
          Object.entries(data.read).filter(
            ([id, v]) =>
              typeof v === "string" &&
              [...articles, ...lessons, ...circuits].some((c) => c.id === id),
          ),
        ) as Record<string, string>,
      };
  } catch {
    /* Reading still works when local storage is unavailable. */
  }
  return { version: 1, read: {} };
}
