/**
 * Exports a grid to an `.xlsx` workbook in plain Node, with no DOM, the way
 * a server job would, and checks the file is a zip holding a worksheet.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createGridController,
  defaultMessages,
  exportFile,
  resolveExportWriters,
} from "@gridkitjs/core";
import { xlsxWriter } from "@gridkitjs/export-xlsx";

/** @param {string} message */
function fail(message) {
  console.error(message);
  process.exit(1);
}

if (typeof globalThis.document !== "undefined") {
  fail("A DOM is present, so this check would prove nothing.");
}

const controller = createGridController({
  dataSource: [
    { id: 1, customer: "Alpha", amount: 1250.5, placed: new Date(2026, 10, 4) },
    { id: 2, customer: "Beta", amount: 80, placed: new Date(2026, 9, 1) },
  ],
  columns: [
    { field: "id", type: "number" },
    { field: "customer" },
    { field: "amount", type: "currency", format: { currency: "EUR" } },
    { field: "placed", type: "date" },
  ],
  locale: "en-US",
});

const writer = xlsxWriter({ sheetName: "Orders" });
const file = await exportFile(
  {
    view: controller.getView(),
    state: controller.getState(),
    options: controller.getOptions(),
    messages: defaultMessages,
  },
  writer,
  { fileName: "orders" },
  resolveExportWriters([writer]),
);

if (file === null || typeof file.content === "string") {
  fail("The writer did not return the workbook's bytes.");
}

const bytes = Buffer.from(file.content);
// "PK", the signature every zip starts with; a zip stores its part names
// uncompressed, so the worksheet's shows up as plain text.
if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
  fail("The workbook is not a zip file.");
}
if (!bytes.includes("xl/worksheets/sheet1.xml")) {
  fail("The workbook has no worksheet.");
}

const out = path.join(import.meta.dirname, "out");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, file.fileName), bytes);
console.log(`Wrote ${file.fileName}, ${bytes.length} bytes.`);
