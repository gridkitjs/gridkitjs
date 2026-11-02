import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import istanbul from "vite-plugin-istanbul";
import { defineConfig, devices } from "@playwright/experimental-ct-react";

// `test-exclude` (the matcher both this plugin and `nyc` use under the hood)
// refuses to instrument anything outside its own `cwd` — which defaults to
// `process.cwd()`, i.e. this package, not the monorepo root. `DataGrid` and
// the behaviours it attaches live in sibling packages, so `cwd` has to be
// pushed up to the repo root or every file is silently treated as "outside"
// and never instrumented.
const repoRoot = path.resolve(import.meta.dirname, "../..");

/**
 * Instrumentation is opt-in via `requireEnv` rather than always-on: the
 * everyday `test:e2e` run should stay fast and uninstrumented, and only
 * `test:e2e:coverage` (which sets `VITE_COVERAGE=true`) pays for it. The CT
 * build cache under `playwright/.cache` is not keyed on that variable, so
 * `test:e2e:coverage` deletes it first — an uninstrumented bundle reused from
 * a plain run would collect no coverage at all.
 */
const coveragePlugin = istanbul({
  cwd: repoRoot,
  include: [
    "packages/react/src/DataGrid/**/*.{ts,tsx}",
    "packages/dom/src/**/*.ts",
  ],
  extension: [".ts", ".tsx"],
  requireEnv: true,
  forceBuildInstrument: true,
});

export default defineConfig({
  testDir: "./tests-ct",
  // Clears any coverage JSON left over from a previous run, so re-running
  // `test:e2e:coverage` never merges results across unrelated runs.
  globalSetup: "./tests-ct/support/globalSetup.ts",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
    ctViteConfig: {
      plugins: [react(), tailwindcss(), coveragePlugin],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
