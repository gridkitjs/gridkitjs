import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";

/** @import { ChangelogEntry, DocsManifest } from "./build-docs-manifest.mjs" */

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const BUILDER = path.join(REPO_ROOT, "scripts", "build-docs-manifest.mjs");
// The website strips a fetched page blob with this same pattern.
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const BLOB_SHA = /^[0-9a-f]{40}$/;

/** @param {string[]} args */
function git(...args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

/** @param {string} repoPath */
function readRepoFile(repoPath) {
  return readFileSync(path.join(REPO_ROOT, repoPath), "utf8");
}

/**
 * @param {DocsManifest} manifest
 * @returns {[string, ChangelogEntry][]} Each package's changelog, paired
 *   with the repo path of its `CHANGELOG.md`.
 */
function changelogs(manifest) {
  return Object.entries(manifest.packages).flatMap(([slug, { changelog }]) =>
    changelog === null ? [] : [[`packages/${slug}/CHANGELOG.md`, changelog]],
  );
}

describe("build-docs-manifest", () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "gridkit-manifest-"));

  /**
   * @param {string[]} flags
   * @returns {DocsManifest}
   */
  function build(...flags) {
    const outFile = path.join(tempDir, "docs-manifest.json");
    execFileSync(process.execPath, [BUILDER, outFile, ...flags], {
      stdio: "ignore",
    });
    return JSON.parse(readFileSync(outFile, "utf8"));
  }

  /** @type {DocsManifest} */
  let index;
  /** @type {DocsManifest} */
  let inlined;

  before(() => {
    index = build();
    inlined = build("--inline-bodies");
  });

  after(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("writes schema 2 with no bodies by default", () => {
    assert.equal(index.schemaVersion, 2);
    assert.notEqual(index.docs.length, 0);
    for (const doc of index.docs) {
      assert.equal("body" in doc, false, doc.repoPath);
    }
    for (const [repoPath, changelog] of changelogs(index)) {
      assert.equal("body" in changelog, false, repoPath);
    }
  });

  test("records the git blob SHA of every page and changelog", () => {
    assert.notEqual(changelogs(index).length, 0);
    /** @type {[string, { blobSha: string }][]} */
    const entries = [
      ...index.docs.map((doc) => [doc.repoPath, doc]),
      ...changelogs(index),
    ];
    for (const [repoPath, { blobSha }] of entries) {
      assert.match(blobSha, BLOB_SHA, repoPath);
      assert.equal(blobSha, git("hash-object", "--", repoPath), repoPath);
    }
  });

  test("--inline-bodies writes every body", () => {
    for (const doc of inlined.docs) {
      const body = readRepoFile(doc.repoPath).replace(FRONTMATTER, "");
      assert.equal(doc.body, body, doc.repoPath);
    }
    for (const [repoPath, changelog] of changelogs(inlined)) {
      assert.equal(changelog.body, readRepoFile(repoPath), repoPath);
    }
  });

  test("--inline-bodies changes nothing but the bodies", () => {
    const withoutBodies = {
      ...inlined,
      generatedAt: index.generatedAt,
      docs: inlined.docs.map(({ body: _body, ...doc }) => doc),
      packages: Object.fromEntries(
        Object.entries(inlined.packages).map(([slug, entry]) => {
          if (entry.changelog === null) return [slug, entry];
          const { body: _body, ...changelog } = entry.changelog;
          return [slug, { ...entry, changelog }];
        }),
      ),
    };
    assert.deepEqual(withoutBodies, index);
  });
});
