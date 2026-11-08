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

/** What goes wrong with the next print frame. */
type Sabotage = "print throws" | "removed before load";

/**
 * Breaks the next frame `printDocument` adds to `document.body`: takes it
 * away again before it loads, or makes its `print()` throw. The frame is
 * caught as it is added, so its `load` listener runs after
 * `printDocument`'s own, as `recordPrints`' does, and before the dialog
 * opens.
 */
function sabotageNextFrame(sabotage: Sabotage): void {
  const observer = new MutationObserver((records) => {
    const frame = records
      .flatMap((record) => [...record.addedNodes])
      .find((node) => node instanceof HTMLIFrameElement);
    if (frame === undefined) {
      return;
    }
    observer.disconnect();
    if (sabotage === "removed before load") {
      frame.remove();
      return;
    }
    frame.addEventListener(
      "load",
      () => {
        if (frame.contentWindow !== null) {
          frame.contentWindow.print = () => {
            throw new Error("The print dialog failed to open.");
          };
        }
      },
      { once: true },
    );
  });
  observer.observe(document.body, { childList: true });
}

/**
 * `printDocument` as a renderer calls it, with `buildPrintDocument` and
 * `printStyles` and a rule of the app's own after them. It writes what a
 * spec cannot otherwise see where one can read it: every print as its
 * dialog opened (the frame is gone the moment headless Chromium's `print()`
 * returns), and the order the calls settled in, a rejected one as
 * "<name> failed". "Print twice" asks for a second print while the first is
 * open; "Print, failing" and "Print, frame taken away" break the print they
 * start.
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
    void request.then(
      () => {
        setSettled((current) => [...current, name]);
      },
      () => {
        setSettled((current) => [...current, `${name} failed`]);
      },
    );
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
      <button
        type="button"
        onClick={() => {
          sabotageNextFrame("print throws");
          track("first", printOnce());
        }}
      >
        Print, failing
      </button>
      <button
        type="button"
        onClick={() => {
          sabotageNextFrame("removed before load");
          track("first", printOnce());
        }}
      >
        Print, frame taken away
      </button>
      <output data-testid="prints">{JSON.stringify(prints)}</output>
      <output data-testid="settled">{settled.join(",")}</output>
    </div>
  );
}
