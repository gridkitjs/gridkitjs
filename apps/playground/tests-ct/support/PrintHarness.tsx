import { useEffect, useState } from "react";
import { buildPrintDocument, type ExportTable } from "@gridkitjs/core";
import { printDocument, printStyles } from "@gridkitjs/dom";
import { recordPrints, type RecordedPrint } from "./printRecorder";

const table: ExportTable = {
  columns: [
    {
      id: "name",
      header: "Name",
      type: "string",
      alignment: "left",
      width: 100,
    },
    {
      id: "score",
      header: "Score",
      type: "number",
      alignment: "right",
      width: 60,
    },
  ],
  header: true,
  rows: [
    {
      kind: "data",
      rowId: "r1",
      cells: [
        { value: "Alice", text: "Alice" },
        { value: 30, text: "30" },
      ],
    },
    {
      kind: "data",
      rowId: "r2",
      cells: [
        { value: "<Bravo>", text: "<Bravo>" },
        { value: 9, text: "9" },
      ],
    },
  ],
  footer: null,
};

const printable = buildPrintDocument(table, { title: "Orders <Q1>" });

function printOnce(): Promise<void> {
  return printDocument({
    title: printable.title,
    bodyHtml: printable.bodyHtml,
    styles: `${printStyles(printable.page)}\n.app-extra { color: red; }`,
  });
}

/**
 * `printDocument` as a renderer calls it, with `buildPrintDocument` and
 * `printStyles` and a rule of the app's own after them. It writes what a
 * spec cannot otherwise see where one can read it: every print as its
 * dialog opened (the frame is gone the moment headless Chromium's `print()`
 * returns), and the order the calls settled in. "Print twice" asks for a
 * second print while the first is open.
 */
export default function PrintHarness() {
  const [prints, setPrints] = useState<readonly RecordedPrint[]>([]);
  const [settled, setSettled] = useState<readonly string[]>([]);

  useEffect(
    () =>
      recordPrints((print) => {
        setPrints((current) => [...current, print]);
      }),
    [],
  );

  function track(name: string, request: Promise<void>): void {
    void request.then(() => {
      setSettled((current) => [...current, name]);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          track("first", printOnce());
        }}
      >
        Print
      </button>
      <button
        type="button"
        onClick={() => {
          track("first", printOnce());
          track("second", printOnce());
        }}
      >
        Print twice
      </button>
      <output data-testid="prints">{JSON.stringify(prints)}</output>
      <output data-testid="settled">{settled.join(",")}</output>
    </div>
  );
}
