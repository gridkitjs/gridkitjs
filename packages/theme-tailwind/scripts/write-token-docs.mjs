/**
 * Rewrites the token tables on `docs/tokens.mdx` from `src/tokens.json`.
 *
 * Usage: pnpm --filter @gridkitjs/theme-tailwind docs:tokens
 */
import { readFileSync, writeFileSync } from "node:fs";
import { readManifest } from "./manifest.mjs";
import { DOCS_PAGE, withTokenTables } from "./token-docs.mjs";

const page = readFileSync(DOCS_PAGE, "utf8");
writeFileSync(DOCS_PAGE, withTokenTables(page, readManifest().tokens));
