// Route aliases contain no lesson/content data and are safe in the workbench bundle.
const aliases: Record<string, string> = {
  "ochrona-silnika": "zabezpieczenia-silnikowe",
  czasowy: "czasowe",
  silniki: "silnik",
};
export const canonicalCardId = (id: string) => aliases[id] ?? id;
export const cardHref = (id: string) =>
  `#/wiedza/aparaty/${canonicalCardId(id)}`;
