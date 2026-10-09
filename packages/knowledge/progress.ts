import type { LearningProgress } from "./types";
export const progressKey = "ele.knowledge.progress.v1";
export function readProgress(): LearningProgress {
  try {
    const data = JSON.parse(localStorage.getItem(progressKey) ?? "null");
    if (data?.version === 1 && data.read && typeof data.read === "object")
      return {
        version: 1,
        read: Object.fromEntries(
          Object.entries(data.read).filter(
            ([id, value]) =>
              /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) &&
              typeof value === "string",
          ),
        ) as Record<string, string>,
      };
  } catch {
    /* Reading remains available without local storage. */
  }
  return { version: 1, read: {} };
}
