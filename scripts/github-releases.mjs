/**
 * Tags a stable release and writes its GitHub Releases. For each package
 * version: an annotated tag `@gridkitjs/<pkg>@<version>` on the release
 * commit (the format `changeset publish` used, so the history keeps one),
 * and a GitHub Release on that tag whose notes are the version's section of
 * the package's `CHANGELOG.md`, ending with a compare link from the previous
 * version's tag when it exists.
 *
 * Re-running is safe: a tag the remote already has is not moved, and a
 * release that already exists is not touched. Every version's notes are
 * read before anything is created, so a missing changelog section fails the
 * run with nothing half-done.
 *
 * Usage: node scripts/github-releases.mjs [--packages <json>] [--sha <commit>] [--dry-run]
 * `--packages` is a JSON array of `{ name, version }`, as the release plan's
 * `unreleased` output gives it; it defaults to every published package at
 * the version in its `package.json`. `--sha` defaults to HEAD. `--dry-run`
 * prints the tags, releases and notes without creating any, and needs only
 * read access. Creating them needs git allowed to push tags to `origin`, a
 * committer identity for the tags, and `gh` with `contents: write`
 * (`GH_TOKEN` in CI).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { publishedPackages, run } from "./lib/packages.mjs";
import {
  appendSummary,
  changelogSection,
  githubRepository,
  remoteTags,
  tagName,
} from "./lib/release.mjs";

/**
 * @typedef {object} ReleasePlan
 * @property {string} tag
 * @property {boolean} tagExists
 * @property {boolean} releaseExists
 * @property {string} notes
 */

/**
 * @param {string} repo
 * @param {string} tag
 * @returns {Promise<boolean>}
 */
async function releaseExists(repo, tag) {
  const result = await run("gh", [
    "release",
    "view",
    tag,
    "--repo",
    repo,
    "--json",
    "tagName",
  ]);
  if (result.code === 0) return true;
  if (/release not found/i.test(result.output)) return false;
  throw new Error(`gh release view ${tag} failed:\n${result.output}`);
}

/**
 * @param {string} command
 * @param {string[]} args
 */
async function mustRun(command, args) {
  const result = await run(command, args);
  if (result.code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.output}`);
  }
  return result;
}

async function main() {
  const { values } = parseArgs({
    options: {
      packages: { type: "string" },
      sha: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const dryRun = values["dry-run"];
  const packages = new Map(publishedPackages().map((pkg) => [pkg.name, pkg]));

  /** @type {{ name: string, version: string }[]} */
  const targets =
    values.packages === undefined
      ? [...packages.values()].map((pkg) => ({
          name: pkg.name,
          version: String(pkg.manifest.version),
        }))
      : JSON.parse(values.packages);
  if (targets.length === 0) {
    console.error("No package versions to release.");
    return 0;
  }

  const first = packages.get(targets[0]?.name ?? "");
  if (first === undefined) {
    console.error(`Unknown package ${String(targets[0]?.name)}.`);
    return 1;
  }
  const repo = githubRepository(first.manifest);
  const sha =
    values.sha ?? (await mustRun("git", ["rev-parse", "HEAD"])).stdout.trim();
  const tags = await remoteTags();

  /** @type {ReleasePlan[]} */
  const plans = [];
  for (const target of targets) {
    const pkg = packages.get(target.name);
    if (pkg === undefined) {
      console.error(`Unknown package ${target.name}.`);
      return 1;
    }
    let changelog = "";
    try {
      changelog = readFileSync(path.join(pkg.dir, "CHANGELOG.md"), "utf8");
    } catch {
      // Reported below as a missing section.
    }
    const section = changelogSection(changelog, target.version);
    if (section === null) {
      console.error(
        `${target.name}'s CHANGELOG.md has no section for ${target.version}.`,
      );
      return 1;
    }
    const tag = tagName(target);
    const previous =
      section.previous === null
        ? null
        : tagName({ name: target.name, version: section.previous });
    const compare =
      previous !== null && tags.has(previous)
        ? `\n\n**Full changelog**: https://github.com/${repo}/compare/${previous}...${tag}`
        : "";
    plans.push({
      tag,
      tagExists: tags.has(tag),
      releaseExists: await releaseExists(repo, tag),
      notes: `${section.body}${compare}\n`,
    });
  }

  for (const plan of plans) {
    const tagAction = plan.tagExists ? "exists" : `create at ${sha}`;
    const releaseAction = plan.releaseExists ? "exists" : "create";
    console.log(
      `${plan.tag}\n  tag: ${tagAction}\n  release: ${releaseAction}`,
    );
    if (dryRun && !plan.releaseExists) {
      console.log(`  notes:\n${plan.notes.replace(/^/gm, "    ")}`);
    }
  }
  appendSummary(
    [
      `### ${dryRun ? "Would tag and release" : "Tags and releases"} in ${repo}`,
      "",
      ...plans.flatMap((plan) => [
        `#### ${plan.tag}`,
        "",
        `Tag: ${plan.tagExists ? "exists" : `create at \`${sha}\``}. Release: ${plan.releaseExists ? "exists" : "create"}.`,
        "",
        ...(plan.releaseExists ? [] : [plan.notes]),
      ]),
    ].join("\n"),
  );
  if (dryRun) return 0;

  const notesDir = mkdtempSync(path.join(os.tmpdir(), "gridkit-notes-"));
  try {
    for (const plan of plans) {
      if (!plan.tagExists) {
        // Annotated, with the tag as its message, like every earlier tag.
        await mustRun("git", ["tag", "-a", plan.tag, "-m", plan.tag, sha]);
        await mustRun("git", ["push", "origin", `refs/tags/${plan.tag}`]);
        console.log(`tagged    ${plan.tag}`);
      }
      if (!plan.releaseExists) {
        const notesFile = path.join(notesDir, "notes.md");
        writeFileSync(notesFile, plan.notes);
        await mustRun("gh", [
          "release",
          "create",
          plan.tag,
          "--repo",
          repo,
          "--verify-tag",
          "--title",
          plan.tag,
          "--notes-file",
          notesFile,
        ]);
        console.log(`released  ${plan.tag}`);
      }
    }
  } finally {
    rmSync(notesDir, { recursive: true, force: true });
  }
  return 0;
}

process.exitCode = await main();
