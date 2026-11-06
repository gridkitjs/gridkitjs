/**
 * Checks that every JSX tag the docs use is one the website registers. The
 * two repos couple by tag name only: a tag missing from the website's MDX
 * component map renders as literal text, so this fails the build first.
 *
 * Usage: node scripts/check-mdx-tags.mjs
 *
 * The registered tags come from `https://next.gridkitjs.com/mdx-tags.json`,
 * a JSON array of tag names the website publishes on every build. The next
 * site is the website's `development` branch, which holds everything on its
 * `main` plus the examples for features gridkit has merged but not yet
 * released, so a docs page can use a new example's tag in the same PR as
 * the feature, before the release ships it to `gridkitjs.com`. Point the
 * check elsewhere with `MDX_TAGS_FILE` (a local copy, e.g. one generated in
 * the website repo by `node scripts/export-mdx-tags.mjs`) or `MDX_TAGS_URL`.
 *
 * A 404 from the hosted list skips the check with a warning instead of
 * failing it, so CI keeps passing until the website first publishes the
 * list. So does a default host that does not resolve, until the next site
 * is first deployed. Any other failure to read the list fails the check,
 * and so does an `MDX_TAGS_URL` whose host does not resolve.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const DEFAULT_TAGS_URL = "https://next.gridkitjs.com/mdx-tags.json";
const FETCH_TIMEOUT_MS = 15_000;

const IN_CI = process.env.GITHUB_ACTIONS === "true";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const FENCE_OPEN = /^\s*(`{3,}|~{3,})/;
/** A code span: a run of backticks, its text, and a run of the same length. */
const CODE_SPAN = /(`+)(?!`)(?:(?!\n[ \t]*\n)[\s\S])*?[^`]\1(?!`)/g;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const MDX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;
/** An opening JSX tag whose name is PascalCase; lowercase ones are HTML. */
const COMPONENT_TAG = /<([A-Z]\w*(?:\.\w+)*)(?=[\s/>])/g;

/**
 * @typedef {object} TagUse
 * @property {string} tag
 * @property {string} repoPath
 * @property {number} line 1-based.
 */

/** @param {unknown} error */
function isMissingFile(error) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/**
 * Whether `fetch` failed because the host name does not resolve; `fetch`
 * puts the reason for a network failure in its `cause`.
 *
 * @param {unknown} error
 */
function isUnresolvedHost(error) {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    cause instanceof Error && "code" in cause && cause.code === "ENOTFOUND"
  );
}

/** @param {string} message */
function warn(message) {
  console.warn(IN_CI ? `::warning title=MDX tags::${message}` : message);
}

/** @param {TagUse} use */
function reportUnregistered({ tag, repoPath, line }) {
  const message = `<${tag}> is not registered on the website`;
  console.error(
    IN_CI
      ? `::error file=${repoPath},line=${line}::${message}`
      : `${repoPath}:${line}: ${message}`,
  );
}

/**
 * Replaces every character but line breaks with a space, so text removed
 * from a page leaves every later line number where it was.
 *
 * @param {string} text
 */
function blank(text) {
  return text.replace(/[^\n]/g, " ");
}

/**
 * Blanks fenced code blocks, which may show a `<Tag>` as text. A fence
 * closes on a line holding only a run of its own character at least as
 * long as the one that opened it, or at the end of the page.
 *
 * @param {string} source
 */
function blankCodeFences(source) {
  /** @type {string | null} */
  let fence = null;
  return source
    .split("\n")
    .map((line) => {
      if (fence === null) {
        const open = FENCE_OPEN.exec(line);
        if (open) fence = open[1] ?? null;
        return open ? blank(line) : line;
      }
      const trimmed = line.trim();
      const char = fence.charAt(0);
      if (
        trimmed.length >= fence.length &&
        [...trimmed].every((c) => c === char)
      ) {
        fence = null;
      }
      return blank(line);
    })
    .join("\n");
}

/**
 * The page with everything that is not markup blanked out: frontmatter,
 * fenced code, code spans and comments.
 *
 * @param {string} source
 */
function markupOnly(source) {
  return blankCodeFences(source.replace(FRONTMATTER, blank))
    .replace(CODE_SPAN, blank)
    .replace(HTML_COMMENT, blank)
    .replace(MDX_COMMENT, blank);
}

/**
 * @param {string} source
 * @param {string} repoPath
 * @returns {TagUse[]}
 */
function findTagUses(source, repoPath) {
  const markup = markupOnly(source.replace(/\r\n/g, "\n"));
  return [...markup.matchAll(COMPONENT_TAG)].map((match) => ({
    tag: match[1] ?? "",
    repoPath,
    line: markup.slice(0, match.index).split("\n").length,
  }));
}

/**
 * Repo paths of every `.mdx` page under `packages/<pkg>/docs/`.
 *
 * @returns {Promise<string[]>}
 */
async function listDocsPages() {
  const packages = await readdir(path.join(REPO_ROOT, "packages"), {
    withFileTypes: true,
  });
  const pages = await Promise.all(
    packages
      .filter((entry) => entry.isDirectory())
      .map(async ({ name }) => {
        const docsDir = `packages/${name}/docs`;
        let files;
        try {
          files = await readdir(path.join(REPO_ROOT, docsDir), {
            recursive: true,
          });
        } catch (error) {
          if (isMissingFile(error)) return [];
          throw error;
        }
        return files
          .filter((file) => file.endsWith(".mdx"))
          .map((file) => `${docsDir}/${file.split(path.sep).join("/")}`);
      }),
  );
  return pages.flat().sort();
}

/**
 * @param {unknown} value
 * @param {string} source Named in the error when the list is malformed.
 * @returns {Set<string>}
 */
function parseTagList(value, source) {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${source} is not a JSON array of tag names`);
  }
  return new Set(value);
}

/**
 * The tags the website registers, or `null` when the hosted list does not
 * exist yet: a 404, or the default host not resolving.
 *
 * @returns {Promise<Set<string> | null>}
 */
async function loadRegisteredTags() {
  const file = process.env.MDX_TAGS_FILE;
  if (file) {
    return parseTagList(JSON.parse(await readFile(file, "utf8")), file);
  }

  const url = process.env.MDX_TAGS_URL || DEFAULT_TAGS_URL;
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (url === DEFAULT_TAGS_URL && isUnresolvedHost(error)) return null;
    throw error;
  }
  if (!response.ok) {
    // An unread body keeps the socket open past the end of the script.
    await response.body?.cancel();
    if (response.status === 404) return null;
    throw new Error(
      `${url} answered ${response.status} ${response.statusText}`,
    );
  }
  return parseTagList(await response.json(), url);
}

/**
 * Every tag use across the docs pages.
 *
 * @returns {Promise<{ pages: string[], uses: TagUse[] }>}
 */
async function collectTagUses() {
  const pages = await listDocsPages();
  const uses = await Promise.all(
    pages.map(async (repoPath) =>
      findTagUses(
        await readFile(path.join(REPO_ROOT, repoPath), "utf8"),
        repoPath,
      ),
    ),
  );
  return { pages, uses: uses.flat() };
}

/**
 * Sets the exit code rather than calling `process.exit()`, which can abort
 * Node on Windows while `fetch`'s socket is still closing.
 *
 * @returns {Promise<number>} The exit code.
 */
async function main() {
  const registered = await loadRegisteredTags();
  if (registered === null) {
    warn(
      "Skipped: the website has not published mdx-tags.json yet (a 404, or " +
        "a host that does not resolve), so the docs' tags cannot be checked.",
    );
    return 0;
  }

  const { pages, uses } = await collectTagUses();
  const unregistered = uses.filter(({ tag }) => !registered.has(tag));
  if (unregistered.length > 0) {
    unregistered.forEach(reportUnregistered);
    console.error(
      `${unregistered.length} unregistered tag use(s). Register the tag in ` +
        "the website's MDX component map, or fix its name.",
    );
    return 1;
  }

  const distinct = new Set(uses.map(({ tag }) => tag)).size;
  console.log(
    `${uses.length} tag uses in ${pages.length} pages, all registered ` +
      `(${distinct} distinct tags).`,
  );
  return 0;
}

process.exitCode = await main();
