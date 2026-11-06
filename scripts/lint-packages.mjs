/**
 * Lints the tarballs `pack-packages.mjs` wrote, as consumers would install
 * them: publint for packaging mistakes (a missing file, a wrong `exports`
 * condition), and arethetypeswrong for types that fail to resolve under
 * Node or a bundler. attw uses its `esm-only` profile, since the packages
 * ship no CommonJS on purpose, and skips a package that ships no types
 * (`theme-tailwind`, a stylesheet).
 *
 * Usage: node scripts/lint-packages.mjs [--pack-dir <dir>]
 * The directory defaults to `.pack/` at the repo root.
 */
import { parseArgs } from "node:util";
import {
  publishedPackages,
  readTarballs,
  resolvePackDir,
  run,
} from "./lib/packages.mjs";

/** @param {Record<string, any>} manifest */
function shipsTypes(manifest) {
  return (manifest.publishConfig?.types ?? manifest.types) !== undefined;
}

async function main() {
  const { values } = parseArgs({ options: { "pack-dir": { type: "string" } } });
  const tarballs = readTarballs(resolvePackDir(values["pack-dir"]));
  const packages = new Map(publishedPackages().map((pkg) => [pkg.name, pkg]));

  /** @type {string[]} */
  const failed = [];
  for (const [name, tarball] of Object.entries(tarballs)) {
    const pkg = packages.get(name);
    if (pkg === undefined) {
      console.error(`${name} has a tarball but no folder under packages/.`);
      failed.push(name);
      continue;
    }

    /** @type {[string, string[]][]} */
    const checks = [["publint", ["publint", "run", tarball, "--strict"]]];
    if (shipsTypes(pkg.manifest)) {
      checks.push([
        "attw",
        ["attw", tarball, "--profile", "esm-only", "--no-color"],
      ]);
    }

    for (const [label, args] of checks) {
      const result = await run("pnpm", ["exec", ...args]);
      const passed = result.code === 0;
      console.log(`${passed ? "pass" : "FAIL"}  ${label}  ${name}`);
      if (!passed) {
        console.log(result.output);
        failed.push(`${label} ${name}`);
      }
    }
  }

  if (failed.length > 0) {
    console.error(`\nFailed: ${failed.join(", ")}`);
    return 1;
  }
  return 0;
}

process.exitCode = await main();
