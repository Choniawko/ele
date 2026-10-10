import { catalog } from "@catalog/index";
import { articles } from "./articles";
import { canonicalCardId } from "./card-routes";
import data from "./exam-data/device-knowledge.json";
import mappings from "./exam-data/component-catalog-map.json";
import taskData from "./exam-data/ele02-tasks.json";
import { sources } from "./sources";
import type { Article, Section } from "./types";

export interface ApparatusCard extends Article {
  componentIds: string[];
  taskCodes: string[];
  scope: string;
}
const section = (id: string, title: string, body: string): Section => ({
  id,
  title,
  paragraphs: [body],
  sourceIds: ["model"],
});
// Existing short records supply task/category metadata. Overlapping theory is
// resolved once to the detailed article; consumers never select a second principle.
type CardSeed = {
  id: string;
  title?: string;
  componentIds: string[];
  taskCodes: string[];
  manufacturerSources: string[];
  evidence: string;
  principle?: string;
  howToRead?: string;
  classicUse?: string;
  practiceCheck?: string;
  commonMistake?: string;
};
export const apparatusCards: ApparatusCard[] = (
  data.articles as CardSeed[]
).map((a) => {
  const id = canonicalCardId(a.id);
  const detailed = articles.find((x) => x.id === id);
  const productId = mappings.mappings.find(
    (m) =>
      a.componentIds.includes(m.componentId) &&
      "productId" in m &&
      catalog[m.productId!]?.published,
  )?.productId;
  const manuals = taskData.manufacturerSources.filter((s) =>
    a.manufacturerSources.includes(s.id),
  );
  return {
    ...(detailed ?? {
      id,
      slug: id,
      title: a.title!,
      summary: a.principle!.split(/(?<=\.)\s/)[0],
      synonyms: [],
      qualifications: ["ELE.02" as const],
      level: "Podstawy" as const,
      status: "published" as const,
      illustrationProductId: productId ?? "",
      sections: [
        section("operation", "Co zmienia się po zadziałaniu", a.principle!),
        section("appearance", "Jak czytać symbol i rysunek", a.howToRead!),
        section("applications", "Zastosowania", a.classicUse!),
        section("practice", "Próba, która pomaga zrozumieć", a.practiceCheck!),
        section("mistakes", "Typowa pomyłka", a.commonMistake!),
        section("limits", "Źródła i zakres", a.evidence),
      ],
      sources: [
        sources.model,
        ...manuals.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          locator: s.scope,
          verifiedAt: s.checkedAt,
        })),
      ],
      related: [],
    }),
    componentIds: a.componentIds,
    taskCodes: a.taskCodes,
    scope:
      "Teoria ogólna. Dokładna mapa i napięcia należą do wybranego profilu; rola wynika z połączeń konkretnego zadania.",
  };
});
for (const a of articles)
  if (!apparatusCards.some((c) => c.id === a.id)) {
    apparatusCards.push({
      ...a,
      componentIds: [],
      taskCodes: [],
      scope:
        "Teoria ogólna aparatu; sprawdź zakres modelu i mapę wybranego profilu.",
    });
  }
// These two loads have no exam article. Describe only the published educational
// model, rather than inventing a manufacturer profile or a verified task.
for (const [id, title, productId, purpose] of [
  [
    "grzalka",
    "Grzałka — model dydaktyczny",
    "edu-heater",
    "Zamienia energię elektryczną na ciepło; w modelu jest obciążeniem rezystancyjnym.",
  ],
  [
    "wentylator",
    "Wentylator — model dydaktyczny",
    "edu-fan",
    "Wskazuje zasilanie odbiornika; model upraszcza go do obciążenia rezystancyjnego.",
  ],
])
  apparatusCards.push({
    id,
    slug: id,
    title,
    summary: purpose,
    synonyms: [],
    qualifications: ["ELE.02"],
    level: "Podstawy",
    status: "published",
    illustrationProductId: productId,
    componentIds: [],
    taskCodes: [],
    scope:
      "Teoria modelu dydaktycznego — brak zweryfikowanej mapy realnego SKU.",
    sections: [
      section(
        "operation",
        "Co zmienia się po zadziałaniu",
        "Po przyłożeniu napięcia do L/N model pobiera moc. PE jest zaciskiem ochronnym i nie zastępuje powrotu N.",
      ),
      section(
        "limits",
        "Ograniczenia",
        "Nie odwzorowuje temperatury, ruchu, udaru ani charakterystyki rzeczywistego produktu. Parametry nastaw są założeniami modelu.",
      ),
    ],
    sources: [sources.model],
    related: [],
  });
export const apparatusCard = (id: string) =>
  apparatusCards.find((c) => c.id === canonicalCardId(id));
export const cardSection = (id: string, sectionId: string) =>
  apparatusCard(id)
    ?.sections.find((s) => s.id === sectionId)
    ?.paragraphs.join("\n") ?? "";
