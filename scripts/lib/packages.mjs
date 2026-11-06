/**
 * Shared by the package verification scripts: where the published packages
 * live, where their tarballs go, and how to run a command portably on Linux
 * and Windows.
 */
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * @typedef {object} PublishedPackage
 * @property {string} name The npm name, e.g. `@gridkitjs/core`.
 * @property {string} dir Absolute path of the package's folder.
 * @property {Record<string, any>} manifest Its parsed `package.json`.
 */

/**
 * @typedef {object} RunResult
 * @property {number} code The exit code; 1 when the command could not start.
 * @property {string} output Its stdout and stderr, interleaved as written.
 */

export const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

/** Written next to the tarballs by `pack-packages.mjs`. */
export const TARBALLS_FILE = "tarballs.json";

/** @param {string | undefined} value A `--pack-dir` argument, if given. */
export function resolvePackDir(value) {
  return value === undefined
    ? path.join(REPO_ROOT, ".pack")
    : path.resolve(value);
}

/**
 * Every package under `packages/` that is not `private`, in folder order.
 *
 * @returns {PublishedPackage[]}
 */
export function publishedPackages() {
  const root = path.join(REPO_ROOT, "packages");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const dir = path.join(root, entry.name);
      const manifest = JSON.parse(
        readFileSync(path.join(dir, "package.json"), "utf8"),
      );
      return { name: manifest.name, dir, manifest };
    })
    .filter((pkg) => pkg.manifest.private !== true);
}

/**
 * Reads the map `pack-packages.mjs` wrote, resolving each tarball to an
 * absolute path.
 *
 * @param {string} packDir
 * @returns {Record<string, string>} Package name to tarball path.
 */
export function readTarballs(packDir) {
  const file = path.join(packDir, TARBALLS_FILE);
  /** @type {Record<string, string>} */
  let names;
  try {
    names = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `Cannot read ${file}; run node scripts/pack-packages.mjs first.`,
      { cause: error },
    );
  }
  return Object.fromEntries(
    Object.entries(names).map(([name, file]) => [
      name,
      path.join(packDir, file),
    ]),
  );
}

/**
 * Quotes an argument for `cmd.exe`, which Windows needs to start `.cmd`
 * shims such as `npm` and `pnpm`.
 *
 * @param {string} arg
 */
function quoteForCmd(arg) {
  return /[\s"&|<>^]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg;
}

/**
 * Runs a command to completion. `npm`, `pnpm` and `npx` are `.cmd` shims on
 * Windows, which Node only starts through a shell, so there the command line
 * goes through `cmd.exe` with its arguments quoted.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {"capture" | "stderr"} [options.output] `capture` (the default)
 *   collects the output into the result; `stderr` streams it to this
 *   process's stderr, keeping stdout free for a script's own result.
 * @param {NodeJS.ProcessEnv} [options.env] Added to this process's env.
 * @returns {Promise<RunResult>}
 */
export function run(command, args, options = {}) {
  const { cwd = REPO_ROOT, output = "capture", env = {} } = options;
  const windows = process.platform === "win32";
  const child = spawn(
    windows ? [command, ...args].map(quoteForCmd).join(" ") : command,
    windows ? [] : args,
    {
      cwd,
      env: { ...process.env, ...env },
      shell: windows,
      stdio:
        output === "capture" ? ["ignore", "pipe", "pipe"] : ["ignore", 2, 2],
    },
  );
  /** @type {Buffer[]} */
  const chunks = [];
  child.stdout?.on("data", (chunk) => chunks.push(chunk));
  child.stderr?.on("data", (chunk) => chunks.push(chunk));
  // A command that cannot start emits `error`, and may not emit `close`.
  return new Promise((resolve) => {
    child.on("error", (error) => {
      chunks.push(Buffer.from(`${error.message}\n`));
      resolve({ code: 1, output: Buffer.concat(chunks).toString() });
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString() });
    });
  });
}
