/**
 * Shared by the release scripts: what npm and the git remote already hold,
 * the changesets still pending, and how a script reports back to GitHub
 * Actions.
 */
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, run } from "./packages.mjs";

/**
 * @typedef {object} PackageVersion
 * @property {string} name The npm name, e.g. `@gridkitjs/core`.
 * @property {string} version e.g. `0.15.0`.
 */

/**
 * A release's git tag, in the format `changeset publish` has always used,
 * so the history keeps one format: `@gridkitjs/core@0.15.0`.
 *
 * @param {PackageVersion} pkg
 */
export function tagName({ name, version }) {
  return `${name}@${version}`;
}

/**
 * The changeset files in `.changeset/` that release something, sorted. An
 * empty changeset (no package in its frontmatter) releases nothing and
 * changesets/action opens no Version Packages PR for one, so it is left out.
 *
 * @returns {string[]} File names.
 */
export function pendingChangesets() {
  const dir = path.join(REPO_ROOT, ".changeset");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .filter((file) => {
      const markdown = readFileSync(path.join(dir, file), "utf8");
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n?---/.exec(markdown)?.[1];
      return (frontmatter ?? "").trim() !== "";
    })
    .sort();
}

/**
 * Whether npm already has this exact version. Throws on anything but a
 * clear yes or no (a registry outage, say), so a release never guesses.
 * Reading a public package needs no login.
 *
 * @param {PackageVersion} pkg
 * @returns {Promise<boolean>}
 */
export async function isOnNpm({ name, version }) {
  const result = await run("npm", [
    "view",
    `${name}@${version}`,
    "version",
    "--json",
  ]);
  if (result.code === 0) {
    return JSON.parse(result.stdout.trim() || "null") === version;
  }
  // npm 11 answers a missing version, like a missing package, with E404.
  if (/\bE404\b/.test(result.output)) return false;
  throw new Error(`npm view ${name}@${version} failed:\n${result.output}`);
}

/**
 * Every tag on the `origin` remote. Asks the remote rather than the local
 * repository, which in CI is a shallow checkout without tags.
 *
 * @returns {Promise<Set<string>>}
 */
export async function remoteTags() {
  const result = await run("git", ["ls-remote", "--tags", "--refs", "origin"]);
  if (result.code !== 0) {
    throw new Error(`git ls-remote failed:\n${result.output}`);
  }
  return new Set(
    result.stdout.split("\n").flatMap((line) => {
      const tag = line.split("\trefs/tags/")[1]?.trim();
      return tag === undefined || tag === "" ? [] : [tag];
    }),
  );
}

/**
 * Sets the step's outputs in GitHub Actions; does nothing elsewhere.
 *
 * @param {Record<string, string>} outputs Each value on a single line.
 */
export function setOutputs(outputs) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(
    file,
    Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(""),
  );
}

/**
 * Adds Markdown to the run's summary page in GitHub Actions, where a dry
 * run's plan is read; does nothing elsewhere.
 *
 * @param {string} markdown
 */
export function appendSummary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  appendFileSync(file, `${markdown.trimEnd()}\n\n`);
}

/**
 * A warning annotation on the run in GitHub Actions, a plain line elsewhere.
 *
 * @param {string} message
 */
export function warn(message) {
  console.error(
    process.env.GITHUB_ACTIONS === "true"
      ? `::warning::${message}`
      : `warning: ${message}`,
  );
}
