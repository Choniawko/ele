import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdir, readFile, lstat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const pagesBase = "/ele/";
export const releaseTag = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const versionSchema = z.object({
  schemaVersion: z.literal(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  tag: z.string().regex(releaseTag).nullable(),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  base: z.literal(pagesBase),
  builtAt: z.iso.datetime(),
});
export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  files: z
    .array(
      z.object({
        path: z
          .string()
          .refine(
            (p) =>
              !!p &&
              !p.startsWith("/") &&
              !p.includes("\\") &&
              !p.split("/").some((s) => !s || s === "." || s === "..") &&
              !/[\r\n]/.test(p),
          ),
        bytes: z.number().int().nonnegative(),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    )
    .min(1),
});
export const sha256 = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
export const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();
export async function filesIn(root: string, prefix = ""): Promise<string[]> {
  const result: string[] = [];
  for (const name of await readdir(join(root, prefix))) {
    const path = prefix ? `${prefix}/${name}` : name;
    const stat = await lstat(join(root, path));
    if (
      stat.isSymbolicLink() ||
      (!stat.isFile() && !stat.isDirectory()) ||
      (stat.isFile() && stat.nlink > 1)
    )
      throw new Error(`Niedozwolony link lub typ pliku: ${path}`);
    if (stat.isDirectory()) result.push(...(await filesIn(root, path)));
    else result.push(path);
  }
  return result.sort();
}
export async function writeManifest(root: string) {
  const paths = (await filesIn(root)).filter(
    (p) => p !== "asset-manifest.json",
  );
  const files = await Promise.all(
    paths.map(async (path) => {
      const data = await readFile(join(root, path));
      return { path, bytes: data.length, sha256: sha256(data) };
    }),
  );
  await writeFile(
    join(root, "asset-manifest.json"),
    JSON.stringify({ schemaVersion: 1, files }, null, 2) + "\n",
  );
}
export async function validateDist(root: string) {
  const version = versionSchema.parse(
    JSON.parse(await readFile(join(root, "version.json"), "utf8")),
  );
  if (version.tag && version.tag.slice(1) !== version.version)
    throw new Error("Tag nie odpowiada wersji dist.");
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(root, "asset-manifest.json"), "utf8")),
  );
  const actual = (await filesIn(root)).filter(
    (p) => p !== "asset-manifest.json",
  );
  const expected = manifest.files.map((f) => f.path).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("Niepełny manifest lub dodatkowe pliki dist.");
  for (const file of manifest.files) {
    const data = await readFile(join(root, file.path));
    if (data.length !== file.bytes || sha256(data) !== file.sha256)
      throw new Error(`Zmieniony plik dist: ${file.path}`);
  }
  if (
    !actual.includes("index.html") ||
    !actual.includes("favicon.svg") ||
    !actual.some((p) => /^assets\/simulation\.worker-.+\.js$/.test(p))
  )
    throw new Error("Brakuje aplikacji, ikony lub solvera w Workerze.");
  const html = await readFile(join(root, "index.html"), "utf8");
  if (
    !html.includes(`${pagesBase}assets/`) ||
    /(?:src|href)="\/(?!ele\/)/.test(html)
  )
    throw new Error("Build nie używa base /ele/.");
  return version;
}
export function assertReleaseVersion(tag: string, version: string) {
  if (!releaseTag.test(tag) || tag.slice(1) !== version)
    throw new Error("Wymagany stabilny tag vX.Y.Z zgodny z package.json.");
}
export async function checkReleaseRef(tag: string, directory = ".") {
  const runGit = (...args: string[]) =>
    execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();
  const pkg = JSON.parse(
    await readFile(join(directory, "package.json"), "utf8"),
  );
  assertReleaseVersion(tag, pkg.version);
  if (runGit("cat-file", "-t", `refs/tags/${tag}`) !== "tag")
    throw new Error("Wydanie wymaga tagu anotowanego.");
  if (runGit("rev-parse", `${tag}^{commit}`) !== runGit("rev-parse", "HEAD"))
    throw new Error("Checkout nie odpowiada tagowi.");
  runGit("merge-base", "--is-ancestor", "HEAD", "origin/main");
  if (runGit("status", "--porcelain"))
    throw new Error("Wydanie nie może zawierać niezatwierdzonych zmian.");
}
