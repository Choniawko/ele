import { writeFileSync } from "node:fs";
import { referenceExamples } from "../packages/knowledge/reference-examples";
import { referenceTopology } from "../packages/knowledge/reference-topology";
// Only revision/topology identity and port coverage are needed before opening help.
writeFileSync(
  "packages/knowledge/reference-identities.json",
  JSON.stringify(
    referenceExamples.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      referenceRevision: r.referenceRevision,
      topology: referenceTopology(r.create()),
      bindings: r.bindings.map((b) => ({
        deviceId: b.deviceId,
        terminalIds: b.terminalIds,
        symbolIds: b.symbolIds,
      })),
    })),
    null,
    2,
  ) + "\n",
);
