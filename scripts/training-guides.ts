import { writeFileSync } from "node:fs";
import { scenarios } from "../packages/training";
writeFileSync(
  "packages/training/scenario-guides.json",
  JSON.stringify(
    scenarios.map(({ id, description, fidelity, practice, goals, hints }) => ({
      id,
      description,
      fidelity,
      practice,
      goals,
      hints,
    })),
    null,
    2,
  ) + "\n",
);
