/**
 * Imports from `@gridkitjs/core/renderer`, the package's second entry, in
 * plain Node, and checks a building block from it runs.
 */
import { paginationWindow } from "@gridkitjs/core/renderer";

const expected = [1, "ellipsis", 4, 5, 6, "ellipsis", 20];
const actual = paginationWindow(5, 20);

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error(
    `paginationWindow(5, 20) gave ${JSON.stringify(actual)}, not ${JSON.stringify(expected)}.`,
  );
  process.exit(1);
}
console.log("Imported paginationWindow from @gridkitjs/core/renderer.");
