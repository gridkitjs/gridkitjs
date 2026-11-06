/**
 * Decides what a run of the release workflow does, from the repository's
 * state:
 *
 * - `snapshot`: changesets are pending and the push changed a published
 *   package's `src/` (a manual run skips the source check). The packages
 *   go out as `0.0.0-dev-<timestamp>` under the `dev` dist-tag.
 * - `stable`: no changesets are pending, and a package's version is not on
 *   npm or not tagged yet; that is the state the Version Packages PR leaves
 *   behind when it merges, and a release that failed part-way.
 * - `none`: nothing to publish, or a docs-only run.
 *
 * While changesets are pending a stable release waits, since their changes
 * are in the code but not yet in the version numbers or changelogs; the plan
 * warns about any version left waiting that way.
 *
 * Usage: node scripts/release-plan.mjs [--since <commit>] [--mode auto|docs-only]
 * `--since` is the commit the push replaced; omitted or empty, as on a
 * manual run, any pending changeset calls for a snapshot. Prints the plan
 * as JSON to stdout and a readable summary to stderr. In GitHub Actions it
 * also sets the outputs `release`, `has-changesets` and `unreleased` (a
 * JSON array of `{ name, version }`) and writes the run summary.
 */
import path from "node:path";
import { parseArgs } from "node:util";
import { REPO_ROOT, publishedPackages, run } from "./lib/packages.mjs";
import {
  appendSummary,
  isOnNpm,
  pendingChangesets,
  remoteTags,
  setOutputs,
  tagName,
  warn,
} from "./lib/release.mjs";

/**
 * @typedef {object} PackageState
 * @property {string} name
 * @property {string} version The `version` field of its `package.json`.
 * @property {boolean} onNpm
 * @property {boolean} tagged Whether its release tag is on the remote.
 */

/**
 * @typedef {object} Plan
 * @property {"stable" | "snapshot" | "none"} release
 * @property {string} reason
 * @property {string[]} changesets Pending changeset files.
 * @property {boolean | null} sourceChanged `null` when not asked (no
 *   `--since`).
 * @property {PackageState[]} packages
 * @property {{ name: string, version: string }[]} unreleased Not on npm or
 *   not tagged.
 */

const MODES = ["auto", "docs-only"];

/** @param {string} commit */
async function hasCommit(commit) {
  const result = await run("git", ["cat-file", "-e", `${commit}^{commit}`]);
  return result.code === 0;
}

/**
 * Whether any published package's `src/` changed between `commit` and
 * HEAD. When the commit can't be read (the all-zero SHA a push reports for
 * a new branch, or history rewritten since), the answer is yes: a needless
 * snapshot costs less than a missing one.
 *
 * @param {string} commit
 */
async function sourceChangedSince(commit) {
  if (/^0+$/.test(commit)) {
    warn(`No previous commit to compare with; assuming sources changed.`);
    return true;
  }
  // The workflow checks out only HEAD, so the pushed-over commit is
  // fetched on its own; a diff needs just the two trees.
  if (!(await hasCommit(commit))) {
    await run("git", ["fetch", "--quiet", "--depth=1", "origin", commit]);
  }
  if (!(await hasCommit(commit))) {
    warn(`Cannot read ${commit}; assuming sources changed.`);
    return true;
  }
  const diff = await run("git", ["diff", "--name-only", commit, "HEAD"]);
  if (diff.code !== 0) {
    throw new Error(`git diff failed:\n${diff.output}`);
  }
  const sources = publishedPackages().map(
    (pkg) =>
      `${path.relative(REPO_ROOT, pkg.dir).split(path.sep).join("/")}/src/`,
  );
  return diff.stdout
    .split("\n")
    .some((file) => sources.some((dir) => file.startsWith(dir)));
}

/**
 * @param {object} state
 * @param {string} state.mode
 * @param {string[]} state.changesets
 * @param {boolean | null} state.sourceChanged
 * @param {{ name: string, version: string }[]} state.unreleased
 * @returns {Pick<Plan, "release" | "reason">}
 */
function decide({ mode, changesets, sourceChanged, unreleased }) {
  if (mode === "docs-only") {
    return { release: "none", reason: "A docs-only run skips npm." };
  }
  if (changesets.length > 0) {
    if (sourceChanged === false) {
      return {
        release: "none",
        reason:
          "Changesets are pending, but no published package's source changed.",
      };
    }
    return {
      release: "snapshot",
      reason: `${String(changesets.length)} changeset(s) pending: publishing a dev snapshot.`,
    };
  }
  if (unreleased.length > 0) {
    return {
      release: "stable",
      reason: `Not yet on npm or tagged: ${unreleased.map(tagName).join(", ")}.`,
    };
  }
  return {
    release: "none",
    reason: "No changesets pending, and every version is on npm and tagged.",
  };
}

/** @param {Plan} plan */
function summary(plan) {
  const rows = plan.packages.map(
    (pkg) =>
      `| \`${pkg.name}\` | ${pkg.version} | ${pkg.onNpm ? "yes" : "no"} | ${pkg.tagged ? "yes" : "no"} |`,
  );
  return [
    `### Release plan: ${plan.release}`,
    "",
    plan.reason,
    "",
    `Pending changesets: ${String(plan.changesets.length)}. Source changed: ${plan.sourceChanged === null ? "not checked" : plan.sourceChanged ? "yes" : "no"}.`,
    "",
    "| Package | Version | On npm | Tagged |",
    "| --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      since: { type: "string" },
      mode: { type: "string", default: "auto" },
    },
  });
  const mode = values.mode;
  if (!MODES.includes(mode)) {
    console.error(`Unknown --mode ${mode}. Have: ${MODES.join(", ")}.`);
    return 1;
  }

  const changesets = pendingChangesets();
  const tags = await remoteTags();
  /** @type {PackageState[]} */
  const packages = [];
  for (const pkg of publishedPackages()) {
    const version = String(pkg.manifest.version);
    packages.push({
      name: pkg.name,
      version,
      onNpm: await isOnNpm({ name: pkg.name, version }),
      tagged: tags.has(tagName({ name: pkg.name, version })),
    });
  }
  const unreleased = packages
    .filter((pkg) => !pkg.onNpm || !pkg.tagged)
    .map(({ name, version }) => ({ name, version }));
  const since = values.since === "" ? undefined : values.since;
  const sourceChanged =
    since === undefined ? null : await sourceChangedSince(since);

  /** @type {Plan} */
  const plan = {
    ...decide({ mode, changesets, sourceChanged, unreleased }),
    changesets,
    sourceChanged,
    packages,
    unreleased,
  };

  if (changesets.length > 0 && unreleased.length > 0) {
    warn(
      `Not released while changesets are pending: ` +
        `${unreleased.map(tagName).join(", ")}.`,
    );
  }

  console.error(summary(plan));
  console.log(JSON.stringify(plan, null, 2));
  setOutputs({
    release: plan.release,
    "has-changesets": String(changesets.length > 0),
    unreleased: JSON.stringify(unreleased),
  });
  appendSummary(summary(plan));
  return 0;
}

process.exitCode = await main();
