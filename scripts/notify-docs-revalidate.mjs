/**
 * Asks a website deployment to revalidate its docs after a new manifest was
 * published, with a signed POST to its revalidation webhook. The body is
 * `{ ref, sha, manifestSha, ts }`; `ts` is Unix time in seconds, and the
 * website rejects a request whose `ts` is more than five minutes off, so a
 * captured one cannot be replayed. The signature is an HMAC-SHA256 of the
 * body under `DOCS_REVALIDATE_SECRET`, sent as `X-Hub-Signature-256`.
 *
 * Redirects are followed (a 307 or 308 re-sends the POST body). A network
 * error, a 429 or a 5xx is retried twice with the same body; the run fails
 * unless the final response is a 2xx.
 *
 * Usage: node scripts/notify-docs-revalidate.mjs --url <url> --manifest-sha <sha> [--ref <ref>] [--sha <commit>] [--dry-run]
 * An empty `--url` (the repository variable is not set) skips the request
 * with a notice, so a deployment that is not live yet fails nothing.
 * `--ref` defaults to `GITHUB_REF`, `--sha` to HEAD. The secret is read
 * from the environment only, never from an argument. `--dry-run` prints the
 * body and the URL without sending anything or needing the secret.
 */
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { REPO_ROOT } from "./lib/packages.mjs";

const ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;
const FETCH_TIMEOUT_MS = 30_000;

/** @param {string} message */
function notice(message) {
  console.error(
    process.env.GITHUB_ACTIONS === "true"
      ? `::notice::${message}`
      : `notice: ${message}`,
  );
}

/** @param {string[]} args */
function git(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

/**
 * `fetch` reports every network failure as "fetch failed", with the reason
 * (a DNS miss, a refused connection) in its `cause`.
 *
 * @param {unknown} error
 */
function describe(error) {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error
    ? `${error.message}: ${error.cause.message}`
    : error.message;
}

/** @param {number} status */
function isRetryable(status) {
  return status === 429 || status >= 500;
}

/**
 * @param {string} url
 * @param {string} body
 * @param {string} secret
 * @returns {Promise<{ status: number, text: string }>} Status 0 when no
 *   attempt got a response.
 */
async function post(url, body, secret) {
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  /** @type {unknown} */
  let lastError = null;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        redirect: "follow",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Signature-256": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const text = await response.text();
      if (!isRetryable(response.status) || attempt === ATTEMPTS) {
        return { status: response.status, text };
      }
      console.error(`Attempt ${String(attempt)}: HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${String(attempt)}: ${describe(error)}`);
    }
    if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }
  return { status: 0, text: `No response: ${describe(lastError)}` };
}

async function main() {
  const { values } = parseArgs({
    options: {
      url: { type: "string", default: "" },
      "manifest-sha": { type: "string" },
      ref: { type: "string" },
      sha: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const url = values.url.trim();
  if (url === "") {
    notice("No revalidation URL is set, so the website was not notified.");
    return 0;
  }
  const manifestSha = values["manifest-sha"];
  if (manifestSha === undefined || manifestSha === "") {
    console.error("--manifest-sha is required.");
    return 1;
  }
  const ref =
    values.ref ??
    process.env.GITHUB_REF ??
    `refs/heads/${git(["branch", "--show-current"])}`;
  const sha = values.sha ?? git(["rev-parse", "HEAD"]);
  const body = JSON.stringify({
    ref,
    sha,
    manifestSha,
    ts: Math.floor(Date.now() / 1000),
  });

  if (values["dry-run"]) {
    console.log(`Would POST to ${url}:\n${body}`);
    return 0;
  }
  const secret = process.env.DOCS_REVALIDATE_SECRET;
  if (!secret) {
    console.error("DOCS_REVALIDATE_SECRET is not set.");
    return 1;
  }

  const { status, text } = await post(url, body, secret);
  console.log(`HTTP ${String(status)}\n${text}`);
  if (status < 200 || status >= 300) {
    console.error(
      process.env.GITHUB_ACTIONS === "true"
        ? `::error::Revalidation returned HTTP ${String(status)}.`
        : `Revalidation returned HTTP ${String(status)}.`,
    );
    return 1;
  }
  return 0;
}

process.exitCode = await main();
