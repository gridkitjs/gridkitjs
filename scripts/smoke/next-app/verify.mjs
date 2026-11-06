/**
 * Checks `next build` prerendered the home page as a static route, and that
 * the HTML it wrote holds the server-rendered grid rather than an empty
 * shell waiting for the client.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const next = path.join(import.meta.dirname, ".next");

/** @param {string} message */
function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const manifest = JSON.parse(
  readFileSync(path.join(next, "prerender-manifest.json"), "utf8"),
);
if (!("/" in manifest.routes)) {
  fail('"/" is not in the prerender manifest, so it did not build static.');
}

const html = readFileSync(
  path.join(next, "server", "app", "index.html"),
  "utf8",
);
if (!/class="(?:[^"]*\s)?gridkit-data-grid(?:\s[^"]*)?"/.test(html)) {
  fail("The prerendered HTML has no gridkit-data-grid element.");
}
if (!html.includes("Gamma")) {
  fail("The prerendered HTML is missing the grid's rows.");
}
