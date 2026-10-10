import { it, expect } from "vitest";
import {
  lessonDefinitions,
  validateLessonDefinition,
} from "../packages/knowledge/lesson-definitions";
import { referenceExamples } from "../packages/knowledge/reference-examples";
import { advance, initialRuntime } from "@simulation/index";
it("lesson declarations refer to real controls/terminals and independently expected trial results", () => {
  for (const r of referenceExamples) {
    const p = r.create(),
      lesson = lessonDefinitions[r.id];
    expect(validateLessonDefinition(p, lesson)).toEqual([]);
    for (const trial of lesson.trials) {
      let rt = initialRuntime(p);
      for (const action of trial.actions) rt = advance(p, rt, action);
      for (const e of trial.expected)
        expect(
          rt.devices[e.deviceId][e.field],
          `${r.id}/${trial.id}/${e.deviceId}`,
        ).toBe(e.value);
    }
    const bad = structuredClone(lesson);
    bad.probe.red.terminalId = "unknown-terminal";
    bad.controls.push({
      deviceId: "missing-device",
      kind: "toggle",
      label: "bad",
    });
    expect(validateLessonDefinition(p, bad)).toContain(
      `terminal:${bad.probe.red.deviceId}:unknown-terminal`,
    );
    expect(validateLessonDefinition(p, bad)).toContain("device:missing-device");
  }
});
