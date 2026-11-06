/**
 * Builds every published package and packs each into a tarball with
 * `pnpm pack`, exactly as `pnpm publish` would upload it: `publishConfig`
 * applied, so `exports` points at `dist`, and `workspace:` ranges rewritten
 * to real versions. `npm pack` does neither, so it is never used here.
 *
 * Usage: node scripts/pack-packages.mjs [--pack-dir <dir>]
 * The directory defaults to `.pack/` at the repo root and is emptied first.
 * Writes `tarballs.json` there (package name to tarball file name) and
 * prints the same map, with absolute paths, to stdout. Build and pack
 * output goes to stderr.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  TARBALLS_FILE,
  publishedPackages,
  resolvePackDir,
  run,
} from "./lib/packages.mjs";

/** @param {string} dir */
function tarballsIn(dir) {
  return new Set(readdirSync(dir).filter((file) => file.endsWith(".tgz")));
}

async function main() {
  const { values } = parseArgs({ options: { "pack-dir": { type: "string" } } });
  const packDir = resolvePackDir(values["pack-dir"]);

  const build = await run("pnpm", ["-r", "--filter", "./packages/*", "build"], {
    output: "stderr",
  });
  if (build.code !== 0) {
    console.error("Build failed.");
    return 1;
  }

  rmSync(packDir, { recursive: true, force: true });
  mkdirSync(packDir, { recursive: true });

  /** @type {Record<string, string>} */
  const files = {};
  for (const pkg of publishedPackages()) {
    const before = tarballsIn(packDir);
    const pack = await run("pnpm", ["pack", "--pack-destination", packDir], {
      cwd: pkg.dir,
      output: "stderr",
    });
    const added = [...tarballsIn(packDir)].filter((file) => !before.has(file));
    if (pack.code !== 0 || added.length !== 1 || added[0] === undefined) {
      console.error(`Packing ${pkg.name} failed.`);
      return 1;
    }
    files[pkg.name] = added[0];
  }

  writeFileSync(
    path.join(packDir, TARBALLS_FILE),
    `${JSON.stringify(files, null, 2)}\n`,
  );
  const tarballs = Object.fromEntries(
    Object.entries(files).map(([name, file]) => [
      name,
      path.join(packDir, file),
    ]),
  );
  console.log(JSON.stringify(tarballs, null, 2));
  return 0;
}

process.exitCode = await main();
