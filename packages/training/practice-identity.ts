import type { ProjectDocument } from "@model/index";
export const practiceIds = [
  "exam-bistable",
  "exam-start-stop",
  "exam-reversing",
] as const;
export function isPractice(p: ProjectDocument) {
  return (practiceIds as readonly string[]).includes(p.scenarioId ?? "");
}
