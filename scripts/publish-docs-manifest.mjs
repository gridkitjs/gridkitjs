/**
 * Builds `docs-manifest.json` from the checked-out commit and commits it,
 * as the only file, to a manifest branch on `origin`:
 *
 * - `docs-meta`: production, which the website pins by commit SHA. Only the
 *   release workflow writes it, after a stable or docs-only release.
 * - `docs-meta-next`: every push to `main` that touches the docs, for the
 *   next site.
 * - `docs-meta-<branch>`: a preview run by hand from another branch.
 *
 * The commit is made with git plumbing, so the checkout stays on the source
 * commit and the manifest branch never shares history with `main`. Each
 * commit's parent is the branch's previous tip, so the branch keeps every
 * manifest it served. When another run moves the branch first, the push is
 * rejected and the commit is made again on the new tip, up to three times.
 *
 * Usage: node scripts/publish-docs-manifest.mjs --branch <name> [--dry-run]
 * `--branch` must be `docs-meta` or start with `docs-meta-`; slashes in it
 * become dashes, so `docs-meta-feat/x` publishes to `docs-meta-feat-x`.
 * `--dry-run` builds the manifest and makes the commit locally without
 * pushing it. The commit needs a committer identity (git's config, or the
 * `GIT_COMMITTER_*` variables in CI), and the build needs the full history
 * for its dates. Prints `{ branch, sourceSha, parent, manifestSha, pushed }`
 * as JSON to stdout, progress to stderr. In GitHub Actions it also sets the
 * outputs `branch` and `manifest-sha` and writes the run summary.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { REPO_ROOT, run } from "./lib/packages.mjs";
import { appendSummary, setOutputs, warn } from "./lib/release.mjs";

/**
 * @typedef {object} PublishResult
 * @property {string} branch The manifest branch, slashes turned to dashes.
 * @property {string} sourceSha The commit the manifest was built from.
 * @property {string | null} parent The branch's tip the commit sits on, or
 *   `null` when the branch did not exist yet.
 * @property {string} manifestSha The manifest commit.
 * @property {boolean} pushed `false` on a dry run.
 */

const MANIFEST_FILE = "docs-manifest.json";
const BRANCH = /^docs-meta(?:-[A-Za-z0-9._-]+)?$/;
const PUSH_ATTEMPTS = 3;

/**
 * Runs git and returns its trimmed stdout. git is a real executable on every
 * platform, so it needs none of the shell quoting `run` does for `.cmd`
 * shims, and plumbing commands need stdin.
 *
 * @param {string[]} args
 * @param {string} [input] Written to git's stdin.
 */
function git(args, input) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

/** @param {string} name */
function normalizeBranch(name) {
  const branch = name.replaceAll("/", "-");
  if (!BRANCH.test(branch)) {
    throw new Error(
      `--branch ${name} is not a manifest branch: it must be docs-meta or ` +
        "start with docs-meta-.",
    );
  }
  return branch;
}

/**
 * The branch's current tip on `origin`, fetched so a commit can name it as
 * its parent, or `null` when the branch does not exist. Fetched with its
 * history, not `--depth=1`, which would mark the whole repository shallow.
 *
 * @param {string} branch
 * @returns {string | null}
 */
function fetchTip(branch) {
  const line = git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]);
  const sha = line.split("\t")[0];
  if (sha === undefined || sha === "") return null;
  git(["fetch", "--quiet", "origin", `refs/heads/${branch}`]);
  return sha;
}

/**
 * @param {object} options
 * @param {string} options.manifest The built manifest file.
 * @param {string | null} options.parent
 * @param {string} options.sourceSha
 */
function commitManifest({ manifest, parent, sourceSha }) {
  const blob = git(["hash-object", "-w", manifest]);
  const tree = git(["mktree"], `100644 blob ${blob}\t${MANIFEST_FILE}\n`);
  const parentArgs = parent === null ? [] : ["-p", parent];
  return git([
    "commit-tree",
    tree,
    ...parentArgs,
    "-m",
    `docs: publish the manifest for ${sourceSha}`,
  ]);
}

async function main() {
  const { values } = parseArgs({
    options: {
      branch: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (values.branch === undefined) {
    console.error("--branch is required.");
    return 1;
  }
  const branch = normalizeBranch(values.branch);
  const dryRun = values["dry-run"];
  const sourceSha = git(["rev-parse", "HEAD"]);

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "gridkit-manifest-"));
  try {
    const manifest = path.join(tempDir, MANIFEST_FILE);
    const build = await run(
      process.execPath,
      [path.join(REPO_ROOT, "scripts", "build-docs-manifest.mjs"), manifest],
      { output: "stderr" },
    );
    if (build.code !== 0) {
      console.error("Building the docs manifest failed.");
      return 1;
    }

    /** @type {PublishResult | null} */
    let result = null;
    for (let attempt = 1; attempt <= PUSH_ATTEMPTS; attempt++) {
      const parent = fetchTip(branch);
      const manifestSha = commitManifest({ manifest, parent, sourceSha });
      if (dryRun) {
        result = { branch, sourceSha, parent, manifestSha, pushed: false };
        break;
      }
      // Not forced: a rejection means another run moved the branch, and
      // the manifest is committed again on top of its commit.
      const push = await run("git", [
        "push",
        "origin",
        `${manifestSha}:refs/heads/${branch}`,
      ]);
      if (push.code === 0) {
        result = { branch, sourceSha, parent, manifestSha, pushed: true };
        break;
      }
      warn(`Push ${String(attempt)} to ${branch} failed:\n${push.output}`);
    }
    if (result === null) {
      console.error(
        `Could not push to ${branch} in ${String(PUSH_ATTEMPTS)} attempts.`,
      );
      return 1;
    }

    console.error(
      `${result.pushed ? "Published" : "Would publish"} ${result.manifestSha} ` +
        `to ${branch}, built from ${sourceSha}.`,
    );
    console.log(JSON.stringify(result, null, 2));
    setOutputs({ branch, "manifest-sha": result.manifestSha });
    appendSummary(
      [
        `### ${result.pushed ? "Published" : "Would publish"} the docs manifest to \`${branch}\``,
        "",
        `Manifest commit \`${result.manifestSha}\`, built from \`${sourceSha}\`` +
          (result.pushed ? "." : " (dry run: made locally, not pushed)."),
      ].join("\n"),
    );
    return 0;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

process.exitCode = await main();
