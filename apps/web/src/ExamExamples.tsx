import { useState } from "react";
import {
  examTasks,
  examAvailability,
  referenceIsReady,
  taskHref,
} from "../../../packages/knowledge/exams";
import { referenceByTask } from "../../../packages/knowledge/reference-examples";
import { openReferenceCopy } from "./reference-copy";

export function ExamExamples({
  training,
  onClose,
}: {
  training: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  return (
    <>
      <p className="modal-intro">
        {training
          ? "Ćwicz odczytywanie połączeń i próby działania na sprawdzonych wzorcach z obecnych arkuszy. Warianty samodzielnego montażu i diagnozy są jeszcze przygotowywane."
          : "Układy z obecnych arkuszy ELE.02. Każdy sprawdzony wzorzec otwierasz jako własną kopię z wyłączonym zasilaniem."}
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="scenario-grid">
        {examTasks.map((task) => {
          const reference = referenceByTask(task.id);
          const ready =
            !!reference &&
            referenceIsReady(
              examAvailability.find((r) => r.taskId === task.id),
            );
          return (
            <section
              className="scenario-card"
              data-exam-task={task.id}
              key={task.id}
            >
              <strong>{task.id}</strong>
              <p>{task.title}</p>
              <p>
                {ready
                  ? "Sprawdzony model dydaktyczny"
                  : "Materiały źródłowe; wzorzec w przygotowaniu"}
              </p>
              <a href={taskHref(task.code)} onClick={onClose}>
                Arkusz, aparaty i wymagane próby
              </a>
              {ready && (
                <button
                  disabled={opening}
                  onClick={async () => {
                    setOpening(true);
                    setError("");
                    try {
                      await openReferenceCopy(reference.id);
                      onClose();
                    } catch (e) {
                      setError(String(e));
                    } finally {
                      setOpening(false);
                    }
                  }}
                >
                  Otwórz kopię {task.id}
                </button>
              )}
              {reference && (
                <a href={`#/wiedza/uklady/${reference.id}`} onClick={onClose}>
                  Lekcja połączeń
                </a>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
