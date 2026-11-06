/**
 * Shared by the release scripts: what npm and the git remote already hold,
 * the changesets still pending, a version's changelog section, the manifest
 * inside a tarball, and how a script reports back to GitHub Actions.
 */
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { REPO_ROOT, run } from "./packages.mjs";

/**
 * @typedef {object} PackageVersion
 * @property {string} name The npm name, e.g. `@gridkitjs/core`.
 * @property {string} version e.g. `0.15.0`.
 */

/**
 * @typedef {object} ChangelogSection
 * @property {string} body Everything under the version's `##` heading, up
 *   to the next one, trimmed.
 * @property {string | null} previous The version of the section below it,
 *   or `null` for the first release.
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
    "--prefer-online",
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
 * Finds a version's section in a changesets `CHANGELOG.md`, where each
 * release is a `## <version>` heading, newest first.
 *
 * @param {string} markdown
 * @param {string} version
 * @returns {ChangelogSection | null} `null` when the version has no section.
 */
export function changelogSection(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  const next = end === -1 ? undefined : rest[end];
  return {
    body: (end === -1 ? rest : rest.slice(0, end)).join("\n").trim(),
    previous: next === undefined ? null : next.slice(3).trim(),
  };
}

/**
 * The `owner/repo` releases go to: the repository the workflow runs in, or
 * locally the one a package's `repository` field names (npm's trusted
 * publishing requires that field to match the publishing repository).
 *
 * @param {Record<string, any>} manifest A published package's `package.json`.
 */
export function githubRepository(manifest) {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const url = String(manifest.repository?.url ?? manifest.repository);
  const match = /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url);
  if (match?.[1] === undefined) {
    throw new Error(`Cannot read a GitHub repository from ${url}.`);
  }
  return match[1];
}

/**
 * Reads `package/package.json` out of a `.tgz` that `pnpm pack` wrote, so
 * a script knows the name and version a tarball really holds without
 * unpacking it. Tar is 512-byte blocks: a header (name at 0, octal size at
 * 124, type flag at 156, name prefix at 345), then the file's content padded
 * to a whole block.
 *
 * @param {string} file
 * @returns {Record<string, any>}
 */
export function readTarballManifest(file) {
  const tar = gunzipSync(readFileSync(file));
  /** @param {number} start @param {number} length */
  const field = (start, length) =>
    tar
      .subarray(start, start + length)
      .toString("utf8")
      .replace(/\0.*$/s, "");
  for (let offset = 0; offset + 512 <= tar.length;) {
    const name = field(offset, 100);
    if (name === "") break;
    const prefix = field(offset + 345, 155);
    const size = Number.parseInt(field(offset + 124, 12).trim() || "0", 8);
    const type = field(offset + 156, 1);
    const content = offset + 512;
    const fullName = prefix === "" ? name : `${prefix}/${name}`;
    if (fullName === "package/package.json" && (type === "" || type === "0")) {
      return JSON.parse(tar.subarray(content, content + size).toString("utf8"));
    }
    offset = content + Math.ceil(size / 512) * 512;
  }
  throw new Error(`${file} holds no package/package.json.`);
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
