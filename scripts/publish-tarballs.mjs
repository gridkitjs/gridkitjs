/**
 * Publishes the tarballs `pack-packages.mjs` wrote, the same files the
 * package verification tested, with `npm publish <tarball>`. Nothing is
 * rebuilt or repacked: what was verified is what ships.
 *
 * npm authenticates through trusted publishing (OIDC), which needs npm
 * 11.5.1 or newer and a GitHub Actions job with `id-token: write`; no npm
 * token is involved, and provenance is attached automatically. pnpm is not
 * used to publish: its `publish` packs again, from the package folder.
 *
 * Re-running is safe: a version npm already has is skipped. Packages go out
 * in dependency order (`core` before `react`) and the run stops at the first
 * failure, so no package is published ahead of a dependency npm lacks.
 *
 * Usage: node scripts/publish-tarballs.mjs [--pack-dir <dir>] [--tag <dist-tag>] [--dry-run]
 * The directory defaults to `.pack/` at the repo root. `--tag` defaults to
 * npm's own default, `latest`. `--dry-run` runs `npm publish --dry-run` for
 * each version npm lacks; without it the script refuses to run outside
 * GitHub Actions, since nothing is ever published from a laptop. Prints
 * `{ dryRun, versions, published, skipped }` as JSON to stdout, npm's output
 * to stderr. In GitHub Actions it also sets the outputs `versions` (package
 * name to the version its tarball holds, every package) and `published`
 * (a JSON array of `name@version`) and writes the run summary.
 */
import { parseArgs } from "node:util";
import { readTarballs, resolvePackDir, run } from "./lib/packages.mjs";
import {
  appendSummary,
  isOnNpm,
  readTarballManifest,
  setOutputs,
  tagName,
} from "./lib/release.mjs";

/**
 * @typedef {object} Tarball
 * @property {string} name
 * @property {string} version The version inside the tarball.
 * @property {string} file Absolute path.
 * @property {Record<string, any>} manifest The tarball's `package.json`.
 */

/** The first npm release with trusted publishing. */
const MIN_NPM = [11, 5, 1];

const DEPENDENCY_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
];

/** @returns {Promise<string>} The version, or "" when npm can't be run. */
async function npmVersion() {
  const result = await run("npm", ["--version"]);
  return result.code === 0 ? result.stdout.trim() : "";
}

/** @param {string} version */
function supportsTrustedPublishing(version) {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  for (const [index, min] of MIN_NPM.entries()) {
    const part = parts[index] ?? Number.NaN;
    if (Number.isNaN(part)) return false;
    if (part !== min) return part > min;
  }
  return true;
}

/**
 * Orders tarballs so each comes after every other one it depends on.
 *
 * @param {Tarball[]} tarballs
 * @returns {Tarball[]}
 */
function dependencyOrder(tarballs) {
  const names = new Set(tarballs.map((tarball) => tarball.name));
  /** @param {Tarball} tarball */
  const dependsOn = (tarball) =>
    DEPENDENCY_FIELDS.flatMap((field) =>
      Object.keys(tarball.manifest[field] ?? {}),
    ).filter((name) => name !== tarball.name && names.has(name));

  /** @type {Tarball[]} */
  const ordered = [];
  const done = new Set();
  while (ordered.length < tarballs.length) {
    const ready = tarballs.filter(
      (tarball) =>
        !done.has(tarball.name) &&
        dependsOn(tarball).every((name) => done.has(name)),
    );
    if (ready.length === 0) {
      throw new Error("The packages depend on each other in a cycle.");
    }
    for (const tarball of ready) {
      ordered.push(tarball);
      done.add(tarball.name);
    }
  }
  return ordered;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "pack-dir": { type: "string" },
      tag: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const dryRun = values["dry-run"];
  const distTag = values.tag;

  if (!dryRun && process.env.GITHUB_ACTIONS !== "true") {
    console.error(
      "Publishing runs only in the release workflow. Pass --dry-run to " +
        "rehearse it locally.",
    );
    return 1;
  }
  const npm = await npmVersion();
  if (!supportsTrustedPublishing(npm)) {
    console.error(
      `npm ${npm || "(not found)"} cannot publish through trusted ` +
        `publishing; it needs ${MIN_NPM.join(".")} or newer.`,
    );
    return 1;
  }

  /** @type {Tarball[]} */
  const tarballs = Object.entries(
    readTarballs(resolvePackDir(values["pack-dir"])),
  ).map(([name, file]) => {
    const manifest = readTarballManifest(file);
    if (manifest.name !== name) {
      throw new Error(`${file} holds ${String(manifest.name)}, not ${name}.`);
    }
    return { name, version: String(manifest.version), file, manifest };
  });

  /** @type {string[]} */
  const published = [];
  /** @type {string[]} */
  const skipped = [];
  for (const tarball of dependencyOrder(tarballs)) {
    const label = tagName(tarball);
    if (await isOnNpm(tarball)) {
      console.error(`skip     ${label}  already on npm`);
      skipped.push(label);
      continue;
    }
    // Scoped packages are private by default; these are public.
    const args = ["publish", tarball.file, "--access", "public"];
    if (distTag !== undefined) args.push("--tag", distTag);
    if (dryRun) args.push("--dry-run");
    console.error(
      `${dryRun ? "dry-run" : "publish"}  ${label}  dist-tag ${distTag ?? "latest"}`,
    );
    const result = await run("npm", args, { output: "stderr" });
    if (result.code !== 0) {
      console.error(
        `\nPublishing ${label} failed; nothing after it was published. ` +
          "A re-run skips the versions npm already has.",
      );
      return 1;
    }
    published.push(label);
  }

  const versions = Object.fromEntries(
    tarballs.map((tarball) => [tarball.name, tarball.version]),
  );
  console.log(
    JSON.stringify({ dryRun, versions, published, skipped }, null, 2),
  );
  setOutputs({
    versions: JSON.stringify(versions),
    published: JSON.stringify(published),
  });
  appendSummary(
    [
      `### ${dryRun ? "Would publish" : "Published"} to npm (dist-tag ${distTag ?? "latest"})`,
      "",
      "| Package | Version | Result |",
      "| --- | --- | --- |",
      ...tarballs.map((tarball) => {
        const result = published.includes(tagName(tarball))
          ? dryRun
            ? "would publish"
            : "published"
          : "already on npm";
        return `| \`${tarball.name}\` | ${tarball.version} | ${result} |`;
      }),
    ].join("\n"),
  );
  return 0;
}

process.exitCode = await main();
