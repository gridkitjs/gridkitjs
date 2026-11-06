/**
 * Tells the website which gridkit versions to install, with a
 * `repository_dispatch` event to its repository. Two events, whose payloads
 * are the contract with the website's receiving workflows:
 *
 * | Event              | `client_payload`                                   |
 * | ------------------ | -------------------------------------------------- |
 * | `gridkit-snapshot` | `{ sha, versions, manifestRef: "docs-meta-next" }` |
 * | `gridkit-release`  | `{ sha, versions, manifestSha }`                   |
 *
 * `sha` is the gridkit commit, all 40 characters. `versions` maps every
 * published package's name to the exact version the website installs, all
 * of them, whether or not this run published it. `manifestSha` is the
 * `docs-meta` commit holding the docs for those versions; `manifestRef` is
 * the branch the next site reads them from.
 *
 * Usage: node scripts/website-dispatch.mjs --event <gridkit-snapshot|gridkit-release>
 *   [--versions <json>] [--sha <commit>] [--manifest-sha <sha>]
 *   [--manifest-ref <branch>] [--repo <owner/name>] [--dry-run]
 * `--versions` is a JSON object, as the release workflow's publish and
 * snapshot jobs output it; omitted or empty, it is each package's
 * `package.json` version, which must then be on npm already (a docs-only
 * release). `--sha` defaults to HEAD, `--manifest-ref` to `docs-meta-next`,
 * `--repo` to `gridkitjs/website`. `--manifest-sha` is required for a
 * release. Sending needs `gh` and a token in `GH_TOKEN` with
 * `contents: write` on the website's repository; `--dry-run` prints the
 * event and payload as JSON to stdout and sends nothing.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { publishedPackages, run } from "./lib/packages.mjs";
import { appendSummary, isOnNpm } from "./lib/release.mjs";

/**
 * @typedef {object} SnapshotPayload
 * @property {string} sha
 * @property {Record<string, string>} versions
 * @property {string} manifestRef
 */

/**
 * @typedef {object} ReleasePayload
 * @property {string} sha
 * @property {Record<string, string>} versions
 * @property {string} manifestSha
 */

const EVENTS = ["gridkit-snapshot", "gridkit-release"];
const DEFAULT_REPO = "gridkitjs/website";
const DEFAULT_MANIFEST_REF = "docs-meta-next";
const SHA = /^[0-9a-f]{40}$/;
/** An exact version, never a range: `0.15.0` or `0.0.0-dev-20261106120000`. */
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/**
 * @param {string} command
 * @param {string[]} args
 */
async function mustRun(command, args) {
  const result = await run(command, args);
  if (result.code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.output}`);
  }
  return result.stdout.trim();
}

/**
 * Checks `versions` names every published package and nothing else, each
 * at an exact version.
 *
 * @param {unknown} versions
 * @param {string[]} names
 * @returns {string[]} The problems found.
 */
function checkVersions(versions, names) {
  if (
    typeof versions !== "object" ||
    versions === null ||
    Array.isArray(versions)
  ) {
    return ["versions must be an object of package names to versions"];
  }
  /** @type {string[]} */
  const problems = [];
  for (const name of names) {
    if (!(name in versions)) problems.push(`versions lacks ${name}`);
  }
  for (const [name, version] of Object.entries(versions)) {
    if (!names.includes(name)) {
      problems.push(`versions names ${name}, which is not published`);
    } else if (typeof version !== "string" || !VERSION.test(version)) {
      problems.push(`${name} must be an exact version, got ${String(version)}`);
    }
  }
  return problems;
}

/**
 * Each published package at its `package.json` version, refusing any that
 * npm lacks: the website would fail to install it.
 *
 * @returns {Promise<Record<string, string>>}
 */
async function currentVersions() {
  /** @type {Record<string, string>} */
  const versions = {};
  for (const pkg of publishedPackages()) {
    const version = String(pkg.manifest.version);
    if (!(await isOnNpm({ name: pkg.name, version }))) {
      throw new Error(
        `${pkg.name}@${version} is not on npm; release it before telling ` +
          "the website to install it.",
      );
    }
    versions[pkg.name] = version;
  }
  return versions;
}

async function main() {
  const { values } = parseArgs({
    options: {
      event: { type: "string" },
      versions: { type: "string" },
      sha: { type: "string" },
      "manifest-sha": { type: "string" },
      "manifest-ref": { type: "string", default: DEFAULT_MANIFEST_REF },
      repo: { type: "string", default: DEFAULT_REPO },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const event = values.event ?? "";
  if (!EVENTS.includes(event)) {
    console.error(`--event must be one of ${EVENTS.join(", ")}.`);
    return 1;
  }
  const dryRun = values["dry-run"];

  /** @type {unknown} */
  const versions =
    values.versions === undefined || values.versions.trim() === ""
      ? await currentVersions()
      : JSON.parse(values.versions);
  const sha = await mustRun("git", [
    "rev-parse",
    "--verify",
    `${values.sha ?? "HEAD"}^{commit}`,
  ]).catch(() => values.sha ?? "");

  const problems = checkVersions(
    versions,
    publishedPackages().map((pkg) => pkg.name),
  );
  if (!SHA.test(sha)) {
    problems.push(`sha must be a full commit SHA, got ${sha || "nothing"}`);
  }
  /** @type {SnapshotPayload | ReleasePayload} */
  let payload;
  const checkedVersions = /** @type {Record<string, string>} */ (versions);
  if (event === "gridkit-release") {
    const manifestSha = values["manifest-sha"] ?? "";
    if (!SHA.test(manifestSha)) {
      problems.push(
        `--manifest-sha must be a full commit SHA, got ${manifestSha || "nothing"}`,
      );
    }
    payload = { sha, versions: checkedVersions, manifestSha };
  } else {
    payload = {
      sha,
      versions: checkedVersions,
      manifestRef: values["manifest-ref"],
    };
  }
  if (problems.length > 0) {
    console.error(`Cannot send ${event}:\n  ${problems.join("\n  ")}`);
    return 1;
  }

  const body = { event_type: event, client_payload: payload };
  console.log(JSON.stringify(body, null, 2));
  appendSummary(
    [
      `### ${dryRun ? "Would send" : "Sent"} \`${event}\` to ${values.repo}`,
      "",
      "```json",
      JSON.stringify(payload, null, 2),
      "```",
    ].join("\n"),
  );
  if (dryRun) return 0;

  const dir = mkdtempSync(path.join(os.tmpdir(), "gridkit-dispatch-"));
  try {
    const file = path.join(dir, "dispatch.json");
    writeFileSync(file, JSON.stringify(body));
    await mustRun("gh", [
      "api",
      "--method",
      "POST",
      `repos/${values.repo}/dispatches`,
      "--input",
      file,
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.error(`Sent ${event} to ${values.repo}.`);
  return 0;
}

process.exitCode = await main();
