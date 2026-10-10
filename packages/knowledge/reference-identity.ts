import identities from "./reference-identities.json";
import { referenceTopology } from "./reference-topology";
import type { ProjectDocument } from "@model/index";
// This gate contains no lesson prose, project factory, task database or React.
export function boundReferenceIdentity(project: ProjectDocument) {
  const reference = identities.find(
    (r) => r.id === project.userMetadata.examReference,
  );
  return reference &&
    project.userMetadata.examReferenceRevision ===
      reference.referenceRevision &&
    referenceTopology(project) === reference.topology
    ? reference
    : undefined;
}
export function validateReferenceIdentity(
  id: string,
  revision: string,
  project: ProjectDocument,
  bindings: { deviceId: string; terminalIds: string[]; symbolIds: string[] }[],
) {
  const identity = identities.find((r) => r.id === id);
  return (
    !!identity &&
    identity.referenceRevision === revision &&
    identity.topology === referenceTopology(project) &&
    JSON.stringify(identity.bindings) ===
      JSON.stringify(
        bindings.map(({ deviceId, terminalIds, symbolIds }) => ({
          deviceId,
          terminalIds,
          symbolIds,
        })),
      )
  );
}
