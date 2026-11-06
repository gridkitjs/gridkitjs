/**
 * Installs the tarballs `pack-packages.mjs` wrote into fresh apps, the way a
 * consumer installs from npm, and runs each app's checks. Each fixture under
 * `scripts/smoke/` is copied to a temp folder, its `@gridkitjs/*`
 * dependencies are pointed at the tarballs, and `npm install` then
 * `npm run smoke` run there. The fixtures sit outside the pnpm workspace, so
 * nothing resolves to the packages' sources.
 *
 * Usage: node scripts/smoke-packages.mjs [--pack-dir <dir>] [--keep] [fixture...]
 * Runs every fixture unless some are named. The pack directory defaults to
 * `.pack/` at the repo root. The temp folder is deleted when every fixture
 * passes, unless `--keep` is given, and kept for inspection when one fails.
 */
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  REPO_ROOT,
  readTarballs,
  resolvePackDir,
  run,
} from "./lib/packages.mjs";

const FIXTURES = path.join(REPO_ROOT, "scripts", "smoke");

/** Left behind by running a fixture in place; never copied. */
const BUILD_OUTPUT = new Set(["node_modules", "dist", ".next", "out"]);

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies"];

/**
 * Points every `@gridkitjs/*` dependency of a fixture's `package.json` at its
 * tarball.
 *
 * @param {string} file
 * @param {Record<string, string>} tarballs
 */
function useTarballs(file, tarballs) {
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  for (const field of DEPENDENCY_FIELDS) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (!name.startsWith("@gridkitjs/")) continue;
      const tarball = tarballs[name];
      if (tarball === undefined) {
        throw new Error(`No tarball for ${name}, which the fixture needs.`);
      }
      // npm reads forward slashes on every platform.
      manifest[field][name] = `file:${tarball.split(path.sep).join("/")}`;
    }
  }
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Names every `@gridkitjs/*` package npm installed from somewhere other than
 * a tarball, such as one a fixture forgot to list that came in as another's
 * dependency and so was fetched from the registry.
 *
 * @param {string} dir
 */
function packagesNotFromTarballs(dir) {
  const lock = JSON.parse(
    readFileSync(path.join(dir, "package-lock.json"), "utf8"),
  );
  return Object.entries(lock.packages)
    .filter(([key]) => /(^|\/)node_modules\/@gridkitjs\//.test(key))
    .filter(([, entry]) => !String(entry.resolved).startsWith("file:"))
    .map(([key]) => key);
}

/**
 * @param {string} name
 * @param {string} dir
 * @param {Record<string, string>} tarballs
 * @returns {Promise<boolean>}
 */
async function smoke(name, dir, tarballs) {
  cpSync(path.join(FIXTURES, name), dir, {
    recursive: true,
    filter: (source) => !BUILD_OUTPUT.has(path.basename(source)),
  });
  useTarballs(path.join(dir, "package.json"), tarballs);

  /** @type {[string, string[]][]} */
  const steps = [
    ["npm install", ["install", "--no-audit", "--no-fund"]],
    ["npm run smoke", ["run", "smoke"]],
  ];
  for (const [label, args] of steps) {
    const started = Date.now();
    const result = await run("npm", args, {
      cwd: dir,
      env: { NEXT_TELEMETRY_DISABLED: "1", NO_UPDATE_NOTIFIER: "1" },
    });
    const seconds = ((Date.now() - started) / 1000).toFixed(0);
    if (result.code !== 0) {
      console.log(`FAIL  ${name}  ${label} (${seconds}s)\n\n${result.output}`);
      return false;
    }
    console.log(`  ok  ${name}  ${label} (${seconds}s)`);

    if (label === "npm install") {
      const strays = packagesNotFromTarballs(dir);
      if (strays.length > 0) {
        console.log(
          `FAIL  ${name}  installed from the registry, not a tarball: ` +
            `${strays.join(", ")}; list them in the fixture's package.json.`,
        );
        return false;
      }
    }
  }
  return true;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "pack-dir": { type: "string" },
      keep: { type: "boolean", default: false },
    },
  });
  const tarballs = readTarballs(resolvePackDir(values["pack-dir"]));

  const available = readdirSync(FIXTURES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const unknown = positionals.filter((name) => !available.includes(name));
  if (unknown.length > 0) {
    console.error(
      `Unknown fixture: ${unknown.join(", ")}. Have: ${available.join(", ")}.`,
    );
    return 1;
  }
  const fixtures = positionals.length > 0 ? positionals : available;

  const root = mkdtempSync(path.join(os.tmpdir(), "gridkit-smoke-"));
  /** @type {string[]} */
  const failed = [];
  for (const name of fixtures) {
    let passed;
    try {
      passed = await smoke(name, path.join(root, name), tarballs);
    } catch (error) {
      console.log(`FAIL  ${name}  ${String(error)}`);
      passed = false;
    }
    if (!passed) failed.push(name);
  }

  if (failed.length > 0) {
    console.error(`\nFailed: ${failed.join(", ")}. Kept ${root}`);
    return 1;
  }
  if (values.keep) {
    console.log(`\nKept ${root}`);
  } else {
    rmSync(root, { recursive: true, force: true });
  }
  return 0;
}

process.exitCode = await main();
