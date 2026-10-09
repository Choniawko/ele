// Compatibility fixtures only. These retired layouts are never offered by the UI.
// Regenerate intentionally: pnpm exec tsx tests/fixtures/generate-legacy-projects.ts
import { writeFileSync } from "node:fs";
import { scenarioProject } from "../../packages/training/index";
const fixtures: Record<string, ReturnType<typeof scenarioProject>> = {};
for (const id of [
  "lamp",
  "socket",
  "fan",
  "three-phase",
  "start-stop",
  "dc",
  "distribution",
])
  fixtures[`${id}:false:reference:0`] = scenarioProject(id);
for (const id of [
  "diagnosis",
  "exam-start-stop",
  "exam-bistable",
  "exam-reversing",
])
  fixtures[`${id}:true:reference:0`] = scenarioProject(id, true);
fixtures["exam-start-stop:true:assembly:0"] = scenarioProject(
  "exam-start-stop",
  true,
  "assembly",
);
fixtures["exam-start-stop:true:diagnosis:2"] = scenarioProject(
  "exam-start-stop",
  true,
  "diagnosis",
  2,
);
writeFileSync(
  "tests/fixtures/legacy-projects.json",
  JSON.stringify(fixtures, null, 2) + "\n",
);
