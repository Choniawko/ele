import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import taskData from "../packages/knowledge/exam-data/ele02-tasks.json";

const root = resolve("dist");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const entries = [...html.matchAll(/(?:src|href)="\/ele\/([^" ]+\.js)"/g)].map(
  (m) => resolve(root, m[1]),
);
const initial = new Map<string, Buffer>();
function visit(path: string) {
  if (initial.has(path)) return;
  const bytes = readFileSync(path);
  initial.set(path, bytes);
  // Only static imports: dynamic import(...) belongs to an on-demand feature.
  const imports = bytes
    .toString()
    .matchAll(/(?:^|;)import\s*(?:[\w*{},\s]+from\s*)?["'](\.[^"']+\.js)["']/g);
  for (const m of imports) visit(resolve(dirname(path), m[1]));
}
entries.forEach(visit);
const allText = [...initial.values()].map((b) => b.toString()).join("\n");
const leakedTaskTitles = taskData.tasks
  .filter((t) => allText.includes(t.title))
  .map((t) => t.id);
const historicalFixtures = [
  "Oświetlenie · pierwszy obwód",
  "Sterowanie impulsowe",
  "Diagnoza · obwód oświetlenia",
].filter((t) => allText.includes(t));
const report = {
  baseline: (() => {
    const baselinePath =
      process.argv[2] ?? "release/audit-v030/baseline-index.js";
    if (!existsSync(baselinePath))
      return {
        bytes: 1662609,
        gzipBytes: 473200,
        source:
          "Vite output recorded in v0.3.0 audit; gzip is approximate and uses the original reporting tool",
      };
    const bytes = readFileSync(baselinePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    return {
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
      sha256,
      source:
        sha256 ===
        "3904945f8d679b041e4f333077d6fa3f647b013ffadef37d02a21ef99fe086a8"
          ? "SHA-verified v0.3.0 archive; same Node gzip compression as after"
          : "Supplied baseline file; same Node gzip compression as after",
    };
  })(),
  initial: [...initial].map(([path, bytes]) => ({
    path: relative(root, path),
    bytes: bytes.length,
    gzipBytes: gzipSync(bytes).length,
  })),
  bytes: [...initial.values()].reduce((n, b) => n + b.length, 0),
  gzipBytes: [...initial.values()].reduce((n, b) => n + gzipSync(b).length, 0),
  leakedTaskTitles,
  historicalFixtures,
};
if (!initial.size) throw new Error("No initial JavaScript found");
mkdirSync("release/audit-v030", { recursive: true });
writeFileSync(
  "release/audit-v030/bundle-after.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
if (leakedTaskTitles.length || historicalFixtures.length) process.exitCode = 1;
