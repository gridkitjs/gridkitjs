/**
 * Builds `docs-manifest.json`: every published package's docs pages,
 * `_meta.json` files, changelog and version, with each file's last commit
 * date, in one file the website fetches in a single request.
 * `publish-docs-manifest.mjs` runs it and commits the result to an orphan
 * manifest branch: `docs-meta-next` on a docs push, `docs-meta` on a
 * release.
 *
 * Usage: node scripts/build-docs-manifest.mjs [output-path]
 * The output path defaults to `docs-manifest.json` at the repo root.
 *
 * Dates come from `git log`, so the checkout needs full history
 * (`fetch-depth: 0`); a file with no commit yet gets `null`.
 */
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

/**
 * @typedef {object} DocsManifest
 * @property {1} schemaVersion Bumped when a field changes meaning or goes
 *   away, so the website can tell a manifest it cannot read.
 * @property {string} generatedAt ISO 8601 time the manifest was built.
 * @property {string} sha The gridkit commit the manifest was built from.
 * @property {Record<string, PackageEntry>} packages Keyed by package slug,
 *   the folder name under `packages/` (`core`, `react`, ...).
 * @property {DocEntry[]} docs Every `.mdx` page, sorted by package slug,
 *   then `repoPath`.
 * @property {Record<string, MetaJson>} meta Every parsed `_meta.json`,
 *   keyed by the repo path of its folder (`packages/react/docs/columns`).
 */

/**
 * @typedef {object} PackageEntry
 * @property {string} name The npm name, e.g. `@gridkitjs/core`.
 * @property {string} version The `version` field of its `package.json`.
 * @property {ChangelogEntry | null} changelog `null` before the first
 *   release, when there is no `CHANGELOG.md` yet.
 */

/**
 * @typedef {object} ChangelogEntry
 * @property {string} body The whole `CHANGELOG.md`.
 * @property {string | null} lastModified ISO 8601 date of its last commit.
 */

/**
 * @typedef {object} DocEntry
 * @property {string} repoPath e.g. `packages/react/docs/columns/column-sorting.mdx`.
 * @property {string} pkg Package slug, e.g. `react`.
 * @property {string | null} group The page's folder relative to the
 *   package's `docs/` (`columns`), or `null` for a top-level page.
 * @property {string} fileName File name without `.mdx`, e.g. `column-sorting`.
 * @property {string | null} title Frontmatter `title`, if a string.
 * @property {string | null} description Frontmatter `description`, if a string.
 * @property {number | null} order Index of `fileName` in its folder's
 *   `_meta.json` `order`, or `null` when unlisted.
 * @property {string} body The MDX with its frontmatter stripped.
 * @property {string} blobSha The git blob SHA, as GitHub's trees API reports it.
 * @property {string | null} lastModified ISO 8601 date of its last commit.
 */

/**
 * @typedef {object} MetaJson
 * @property {string} [title]
 * @property {string[]} [order]
 */

/** @typedef {{ slug: string, name: string, version: string }} PackageInfo */

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** @param {string[]} args */
function git(...args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

/** @param {string} repoPath */
function lastModified(repoPath) {
  return git("log", "-1", "--format=%cI", "--", repoPath) || null;
}

/**
 * Hashes the file the way `git add` would, line-ending rules included, so
 * the SHA matches the blob GitHub holds for that commit.
 *
 * @param {string} repoPath
 */
function blobSha(repoPath) {
  return git("hash-object", "--", repoPath);
}

/** @param {string} repoPath */
function readRepoFile(repoPath) {
  return readFile(path.join(REPO_ROOT, repoPath), "utf8");
}

/** @param {unknown} error */
function isMissingFile(error) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** @param {unknown} value */
function stringOrNull(value) {
  return typeof value === "string" ? value : null;
}

/**
 * The packages under `packages/` that are published, which is every one not
 * marked `private`.
 *
 * @returns {Promise<PackageInfo[]>}
 */
async function readPublishedPackages() {
  const entries = await readdir(path.join(REPO_ROOT, "packages"), {
    withFileTypes: true,
  });
  const packages = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async ({ name: slug }) => {
        const raw = await readRepoFile(`packages/${slug}/package.json`);
        const { name, version, private: isPrivate } = JSON.parse(raw);
        return isPrivate ? null : { slug, name, version };
      }),
  );
  return packages
    .filter((pkg) => pkg !== null)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Repo paths of every `.mdx` page and `_meta.json` under a package's
 * `docs/` folder, or none when it has no docs.
 *
 * @param {string} slug
 * @returns {Promise<string[]>} Sorted, so the manifest is stable.
 */
async function listDocsFiles(slug) {
  const docsDir = `packages/${slug}/docs`;
  let files;
  try {
    files = await readdir(path.join(REPO_ROOT, docsDir), { recursive: true });
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
  return files
    .map((file) => `${docsDir}/${file.split(path.sep).join("/")}`)
    .filter(
      (repoPath) =>
        repoPath.endsWith(".mdx") ||
        path.posix.basename(repoPath) === "_meta.json",
    )
    .sort();
}

/**
 * @param {string} raw
 * @param {string} repoPath Named in the error when the frontmatter is not a
 *   YAML mapping.
 * @returns {{ data: Record<string, unknown>, body: string }}
 */
function splitFrontmatter(raw, repoPath) {
  const match = FRONTMATTER.exec(raw);
  if (!match) return { data: {}, body: raw };
  const data = parseYaml(match[1] ?? "") ?? {};
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${repoPath}: frontmatter is not a YAML mapping`);
  }
  return { data, body: raw.slice(match[0].length) };
}

/**
 * @param {string} repoPath
 * @returns {Promise<MetaJson>}
 */
async function readMetaJson(repoPath) {
  const raw = await readRepoFile(repoPath);
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${repoPath}: ${String(error)}`, { cause: error });
  }
}

/**
 * @param {string} repoPath
 * @param {string} slug
 * @param {Record<string, MetaJson>} meta The package's `_meta.json` files,
 *   for the page's `order`.
 * @returns {Promise<DocEntry>}
 */
async function readDocEntry(repoPath, slug, meta) {
  const { data, body } = splitFrontmatter(
    await readRepoFile(repoPath),
    repoPath,
  );
  const dirPath = path.posix.dirname(repoPath);
  const groupPath = path.posix.relative(`packages/${slug}/docs`, dirPath);
  const fileName = path.posix.basename(repoPath, ".mdx");
  const index = meta[dirPath]?.order?.indexOf(fileName) ?? -1;
  return {
    repoPath,
    pkg: slug,
    group: groupPath === "" ? null : groupPath,
    fileName,
    title: stringOrNull(data.title),
    description: stringOrNull(data.description),
    order: index === -1 ? null : index,
    body,
    blobSha: blobSha(repoPath),
    lastModified: lastModified(repoPath),
  };
}

/**
 * @param {string} slug
 * @returns {Promise<ChangelogEntry | null>}
 */
async function readChangelog(slug) {
  const repoPath = `packages/${slug}/CHANGELOG.md`;
  try {
    return {
      body: await readRepoFile(repoPath),
      lastModified: lastModified(repoPath),
    };
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

/**
 * @param {string} slug
 * @returns {Promise<{ pages: DocEntry[], meta: Record<string, MetaJson> }>}
 */
async function readPackageDocs(slug) {
  const files = await listDocsFiles(slug);

  /** @type {Record<string, MetaJson>} */
  const meta = {};
  for (const repoPath of files.filter((file) => !file.endsWith(".mdx"))) {
    meta[path.posix.dirname(repoPath)] = await readMetaJson(repoPath);
  }

  const pages = await Promise.all(
    files
      .filter((file) => file.endsWith(".mdx"))
      .map((repoPath) => readDocEntry(repoPath, slug, meta)),
  );
  return { pages, meta };
}

/** @returns {Promise<DocsManifest>} */
async function buildManifest() {
  /** @type {DocEntry[]} */
  const docs = [];
  /** @type {Record<string, MetaJson>} */
  const meta = {};
  /** @type {Record<string, PackageEntry>} */
  const packageEntries = {};

  for (const { slug, name, version } of await readPublishedPackages()) {
    const packageDocs = await readPackageDocs(slug);
    docs.push(...packageDocs.pages);
    Object.assign(meta, packageDocs.meta);
    packageEntries[slug] = {
      name,
      version,
      changelog: await readChangelog(slug),
    };
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sha: git("rev-parse", "HEAD"),
    packages: packageEntries,
    docs,
    meta,
  };
}

const outFile = path.resolve(
  process.argv[2] ?? path.join(REPO_ROOT, "docs-manifest.json"),
);
const manifest = await buildManifest();
const json = `${JSON.stringify(manifest)}\n`;
await writeFile(outFile, json);
console.log(
  `Wrote ${outFile} (${Math.round(Buffer.byteLength(json) / 1024)} KB): ` +
    `${Object.keys(manifest.packages).length} packages, ` +
    `${manifest.docs.length} pages, ${Object.keys(manifest.meta).length} _meta.json`,
);
