import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import {
  assertReleaseVersion,
  checkReleaseRef,
  validateDist,
  writeManifest,
} from "../scripts/lib/release";
import { createDistServer } from "../scripts/lib/dist-server";

const directories: string[] = [],
  servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((s) => new Promise<void>((done) => s.close(() => done()))),
  );
  await Promise.all(
    directories.splice(0).map((p) => rm(p, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "ele-release-test-"));
  directories.push(root);
  await mkdir(join(root, "assets"));
  for (const [name, data] of Object.entries({
    "index.html": '<script src="/ele/assets/app.js"></script>',
    "favicon.svg": "<svg/>",
    "assets/app.js": "console.log(1)",
    "assets/simulation.worker-test.js": "self.onmessage=()=>{}",
    "version.json": JSON.stringify({
      schemaVersion: 1,
      version: "0.1.0",
      tag: "v0.1.0",
      commit: "a".repeat(40),
      base: "/ele/",
      builtAt: "2026-10-05T10:00:00.000Z",
    }),
  }))
    await writeFile(join(root, name), data);
  await writeManifest(root);
  return root;
}
describe("wydanie i statyczny dist", () => {
  it("odrzuca niezgodną wersję, prerelease i tekst zamiast stabilnego tagu", () => {
    expect(() => assertReleaseVersion("v0.1.0", "0.1.0")).not.toThrow();
    for (const t of [
      "v0.2.0",
      "v01.1.0",
      "v0.1.0-rc.1",
      "main",
      "v0.1.0;echo foo",
    ])
      expect(() => assertReleaseVersion(t, "0.1.0")).toThrow();
  });
  it("akceptuje kompletny manifest i odrzuca zmieniony plik", async () => {
    const root = await fixture();
    expect((await validateDist(root)).tag).toBe("v0.1.0");
    await writeFile(join(root, "assets/app.js"), "console.log(2)");
    await expect(validateDist(root)).rejects.toThrow("Zmieniony plik");
  });
  it("odrzuca dodatkowy plik oraz link do pliku spoza dist", async () => {
    const root = await fixture();
    await writeFile(join(root, "extra.txt"), "extra");
    await expect(validateDist(root)).rejects.toThrow("dodatkowe pliki");
    await rm(join(root, "extra.txt"));
    await symlink(join(root, "index.html"), join(root, "extra.txt"));
    await expect(validateDist(root)).rejects.toThrow("Niedozwolony link");
  });
  it("odrzuca złe base, nawet gdy odtworzono sumy plików", async () => {
    const root = await fixture();
    await writeFile(
      join(root, "index.html"),
      '<script src="/assets/app.js"></script>',
    );
    await writeManifest(root);
    await expect(validateDist(root)).rejects.toThrow("base /ele/");
  });
  it("serwuje tylko /ele/, prawdziwe pliki JS i 404 bez fallbacku oraz bez wyjścia poza katalog", async () => {
    const root = await fixture();
    const server = createDistServer(root);
    servers.push(server);
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Brak portu.");
    const url = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${url}/ele/`)).status).toBe(200);
    const js = await fetch(`${url}/ele/assets/app.js`);
    expect(js.headers.get("content-type")).toContain("javascript");
    expect(await js.text()).toBe(
      await readFile(join(root, "assets/app.js"), "utf8"),
    );
    for (const path of [
      "/",
      "/assets/app.js",
      "/ele/brak.js",
      "/ele/%2e%2e%2fpackage.json",
    ])
      expect((await fetch(url + path)).status).toBe(404);
  });
  it("wymaga anotowanego tagu, checkoutu tego tagu i commita z main", async () => {
    const root = await fixture();
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    git("init", "-b", "main");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Test");
    await writeFile(join(root, "package.json"), '{"version":"0.1.0"}');
    git("add", ".");
    git("commit", "-m", "fixture");
    git("update-ref", "refs/remotes/origin/main", "HEAD");
    git("tag", "v0.1.0");
    await expect(checkReleaseRef("v0.1.0", root)).rejects.toThrow(
      "anotowanego",
    );
    git("tag", "-d", "v0.1.0");
    git("tag", "-a", "v0.1.0", "-m", "release");
    await expect(checkReleaseRef("v0.1.0", root)).resolves.toBeUndefined();
    await writeFile(join(root, "dirty.txt"), "dirty");
    await expect(checkReleaseRef("v0.1.0", root)).rejects.toThrow(
      "niezatwierdzonych",
    );
    await rm(join(root, "dirty.txt"));
    git("checkout", "-b", "unmerged");
    await writeFile(join(root, "new.txt"), "unmerged");
    git("add", ".");
    git("commit", "-m", "unmerged");
    await expect(checkReleaseRef("v0.1.0", root)).rejects.toThrow("Checkout");
    git("tag", "-d", "v0.1.0");
    git("tag", "-a", "v0.1.0", "-m", "unmerged");
    await expect(checkReleaseRef("v0.1.0", root)).rejects.toThrow();
  });
  it("odtwarza te same bajty archiwum; błędna suma zachowuje wcześniejszy dist", async () => {
    const root = await fixture();
    await mkdir(join(root, "dist"));
    const { cp } = await import("node:fs/promises");
    for (const name of [
      "index.html",
      "favicon.svg",
      "assets",
      "version.json",
      "asset-manifest.json",
    ])
      await cp(join(root, name), join(root, "dist", name), { recursive: true });
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    git("init", "-b", "main");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Test");
    await writeFile(join(root, "package.json"), '{"version":"0.1.0"}');
    git("add", "package.json");
    git("commit", "-m", "fixture");
    const version = JSON.parse(
      await readFile(join(root, "dist/version.json"), "utf8"),
    );
    version.commit = git("rev-parse", "HEAD");
    await writeFile(join(root, "dist/version.json"), JSON.stringify(version));
    await writeManifest(join(root, "dist"));
    const script = fileURLToPath(
      new URL("../scripts/release-archive.ts", import.meta.url),
    );
    const run = (mode: string) =>
      execFileSync(
        process.execPath,
        ["--import", import.meta.resolve("tsx"), script, mode],
        {
          cwd: root,
          env: { ...process.env, ELE_RELEASE_TAG: "v0.1.0" },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    run("pack");
    const before = await readFile(join(root, "dist/assets/app.js"));
    await writeFile(join(root, "dist/assets/app.js"), "modified");
    run("restore");
    expect(await readFile(join(root, "dist/assets/app.js"))).toEqual(before);
    await expect(validateDist(join(root, "dist"))).resolves.toMatchObject({
      commit: version.commit,
    });
    await writeFile(join(root, "release/ele-v0.1.0.tar.gz.sha256"), "bad sum");
    expect(() => run("restore")).toThrow();
    expect(await readFile(join(root, "dist/assets/app.js"))).toEqual(before);
  });
});
