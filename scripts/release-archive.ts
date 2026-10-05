import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import { assertReleaseVersion, git, sha256, validateDist } from "./lib/release";

const mode = process.argv[2];
if (mode === "pack") {
  const version = await validateDist("dist");
  const name = `ele-${version.tag ?? `preview-${version.commit.slice(0, 12)}`}.tar.gz`;
  await mkdir("release", { recursive: true });
  const path = join("release", name);
  execFileSync("tar", ["-czf", path, "-C", "dist", "."]);
  await writeFile(
    `${path}.sha256`,
    `${sha256(await readFile(path))}  ${name}\n`,
  );
  await cp("dist/version.json", "release/version.json");
  await cp("dist/asset-manifest.json", "release/asset-manifest.json");
  console.log(`Archiwum niezmienionego dist: ${path}`);
} else if (mode === "restore") {
  const tag = process.env.ELE_RELEASE_TAG ?? "";
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assertReleaseVersion(tag, pkg.version);
  const archive = resolve("release", `ele-${tag}.tar.gz`);
  const sum = await readFile(`${archive}.sha256`, "utf8");
  if (sum !== `${sha256(await readFile(archive))}  ${basename(archive)}\n`)
    throw new Error("Błędna suma archiwum.");
  const paths = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
    .trim()
    .split("\n");
  const types = execFileSync("tar", ["-tvzf", archive], { encoding: "utf8" })
    .trim()
    .split("\n");
  if (
    paths.some((p) => !p.startsWith("./") || p.split("/").includes("..")) ||
    types.some((l) => !["-", "d"].includes(l[0]))
  )
    throw new Error("Niedozwolone ścieżki lub linki archiwum.");
  const temp = await mkdtemp(join(tmpdir(), "ele-release-"));
  try {
    execFileSync("tar", ["-xzf", archive, "-C", temp]);
    const version = await validateDist(temp);
    if (version.tag !== tag || version.commit !== git("rev-parse", "HEAD"))
      throw new Error("Archiwum nie odpowiada tagowi/commitowi.");
    await rm("dist", { recursive: true, force: true });
    await cp(temp, "dist", { recursive: true });
    console.log(
      `Przywrócono zweryfikowane archiwum ${tag}; bez ponownego builda.`,
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
} else throw new Error("Użyj pack lub restore.");
