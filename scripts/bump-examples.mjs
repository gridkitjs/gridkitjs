/**
 * Moves every app under `examples/` to the released packages: each
 * `@gridkitjs/*` dependency an example lists becomes `^<version>`, and its
 * `package-lock.json` is refreshed with `npm install --package-lock-only`.
 * An example only gains the packages it already depends on.
 *
 * The release workflow runs it after a stable release and opens the result
 * as a pull request. npm may take a moment to serve a version just
 * published, so a failed lockfile refresh is retried.
 *
 * Usage: node scripts/bump-examples.mjs [--versions <json>] [--dry-run]
 * `--versions` is a JSON object of package names to versions, as the
 * release workflow's publish job outputs it; omitted or empty, it is each
 * published package's `package.json` version. `--dry-run` prints the
 * changes as a diff and writes nothing. Prints the diff to stdout. In
 * GitHub Actions it also sets the output `changed` (`true` or `false`) and
 * writes the run summary.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { REPO_ROOT, publishedPackages, run } from "./lib/packages.mjs";
import { appendSummary, setOutputs } from "./lib/release.mjs";

/**
 * @typedef {object} Bump
 * @property {string} name The package, e.g. `@gridkitjs/core`.
 * @property {string} from The range the example had.
 * @property {string} to
 */

/**
 * @typedef {object} ExampleChange
 * @property {string} dir Absolute path of the example.
 * @property {string} repoPath e.g. `examples/column-sorting/package.json`.
 * @property {string} before The file's text.
 * @property {string} after
 * @property {Bump[]} bumps
 */

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies"];
const LOCKFILE_ATTEMPTS = 3;
const LOCKFILE_RETRY_MS = 20_000;

/** @param {string} text */
function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The new text of an example's `package.json`, with each range replaced in
 * place so the file keeps its formatting.
 *
 * @param {string} dir
 * @param {Record<string, string>} versions
 * @returns {ExampleChange}
 */
function planExample(dir, versions) {
  const file = path.join(dir, "package.json");
  const before = readFileSync(file, "utf8");
  const manifest = JSON.parse(before);
  /** @type {Bump[]} */
  const bumps = [];
  let after = before;
  for (const field of DEPENDENCY_FIELDS) {
    for (const [name, from] of Object.entries(manifest[field] ?? {})) {
      const version = versions[name];
      if (version === undefined) continue;
      const to = `^${version}`;
      if (from === to) continue;
      const entry = new RegExp(
        `("${escapeRegExp(name)}"\\s*:\\s*)"${escapeRegExp(String(from))}"`,
      );
      after = after.replace(entry, `$1"${to}"`);
      bumps.push({ name, from: String(from), to });
    }
  }
  return {
    dir,
    repoPath: path.relative(REPO_ROOT, file).split(path.sep).join("/"),
    before,
    after,
    bumps,
  };
}

/**
 * A minimal unified diff: each changed line with its old and new text.
 *
 * @param {ExampleChange} change
 */
function diff(change) {
  const before = change.before.split("\n");
  const after = change.after.split("\n");
  const lines = [`--- a/${change.repoPath}`, `+++ b/${change.repoPath}`];
  for (const [index, line] of before.entries()) {
    const next = after[index] ?? "";
    if (line === next) continue;
    lines.push(`@@ -${String(index + 1)} +${String(index + 1)} @@`);
    lines.push(`-${line}`, `+${next}`);
  }
  return lines.join("\n");
}

/** @param {string} dir */
async function refreshLockfile(dir) {
  for (let attempt = 1; attempt <= LOCKFILE_ATTEMPTS; attempt++) {
    const result = await run(
      "npm",
      [
        "install",
        "--package-lock-only",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
      ],
      { cwd: dir },
    );
    if (result.code === 0) return;
    console.error(
      `npm install in ${dir} failed (attempt ${String(attempt)}):\n${result.output}`,
    );
    if (attempt < LOCKFILE_ATTEMPTS) await sleep(LOCKFILE_RETRY_MS);
  }
  throw new Error(`Could not refresh the lockfile in ${dir}.`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      versions: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const dryRun = values["dry-run"];
  /** @type {Record<string, string>} */
  const versions =
    values.versions === undefined || values.versions.trim() === ""
      ? Object.fromEntries(
          publishedPackages().map((pkg) => [
            pkg.name,
            String(pkg.manifest.version),
          ]),
        )
      : JSON.parse(values.versions);

  const examplesDir = path.join(REPO_ROOT, "examples");
  const changes = readdirSync(examplesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(examplesDir, entry.name))
    .filter((dir) => {
      try {
        readFileSync(path.join(dir, "package.json"));
        return true;
      } catch {
        return false;
      }
    })
    .map((dir) => planExample(dir, versions))
    .filter((change) => change.bumps.length > 0);

  const patch = changes.map(diff).join("\n");
  if (patch !== "") console.log(patch);
  console.error(
    changes.length === 0
      ? "Every example is on the released versions."
      : `${dryRun ? "Would bump" : "Bumping"} ${String(changes.length)} example(s)` +
          `${dryRun ? " and refresh their lockfiles" : ""}.`,
  );

  if (!dryRun) {
    for (const change of changes) {
      writeFileSync(path.join(change.dir, "package.json"), change.after);
      await refreshLockfile(change.dir);
    }
  }

  setOutputs({ changed: String(changes.length > 0) });
  appendSummary(
    changes.length === 0
      ? "### Examples\n\nEvery example is on the released versions."
      : [
          `### ${dryRun ? "Would bump" : "Bumped"} the examples`,
          "",
          "```diff",
          patch,
          "```",
        ].join("\n"),
  );
  return 0;
}

process.exitCode = await main();
