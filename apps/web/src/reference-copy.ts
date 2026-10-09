import { useApp } from "./store";

export async function openReferenceCopy(id: string, wireId?: string) {
  const [
    { referenceById, referenceCopy },
    { examAvailability, referenceIsReady },
  ] = await Promise.all([
    import("../../../packages/knowledge/reference-examples"),
    import("../../../packages/knowledge/exams"),
  ]);
  const reference = referenceById(id);
  if (
    !reference ||
    !referenceIsReady(
      examAvailability.find((r) => r.taskId === reference.taskId),
    )
  )
    throw new Error("Wzorzec nie ma jeszcze pełnego odbioru.");
  await useApp.getState().flushSave();
  const copy = referenceCopy(id);
  useApp.getState().load(copy);
  if (wireId) {
    const wire = copy.circuit.conductors.find((w) => w.id === wireId);
    if (wire)
      useApp.setState({
        selection: [wire.id],
        knowledgeHighlight: [wire.from, wire.to],
      });
  }
  await useApp.getState().flushSave();
  location.hash = "workbench";
}
