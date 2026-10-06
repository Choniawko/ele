import { readFile, writeFile } from "node:fs/promises";
import {
  assertReleaseVersion,
  git,
  pagesBase,
  validateDist,
  versionSchema,
  writeManifest,
} from "./lib/release";

const pkg = JSON.parse(await readFile("package.json", "utf8"));
const tag = process.env.ELE_RELEASE_TAG || null;
if (tag) assertReleaseVersion(tag, pkg.version);
const version = versionSchema.parse({
  schemaVersion: 1,
  version: pkg.version,
  tag,
  commit: git("rev-parse", "HEAD"),
  base: pagesBase,
  builtAt: new Date().toISOString(),
});
await writeFile("dist/version.json", JSON.stringify(version, null, 2) + "\n");
await writeFile("dist/.nojekyll", "");
await writeManifest("dist");
await validateDist("dist");
console.log(
  `Dist /ele/: ${version.tag ?? version.version}, commit ${version.commit}.`,
);
