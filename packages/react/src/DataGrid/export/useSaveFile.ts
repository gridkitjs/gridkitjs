import { useRef } from "react";
import type {
  ExportFile,
  GridCommandHost,
  GridMessages,
} from "@gridkitjs/core";
import { downloadBlob } from "@gridkitjs/dom";
import { exportBlob } from "./exportApi";

interface UseSaveFileOptions {
  messages: GridMessages;
  announce: (text: string) => void;
}

/** Whether a writer is still writing the last export asked for. */
type SaveState = { readonly kind: "idle" } | { readonly kind: "writing" };

const IDLE: SaveState = { kind: "idle" };
const WRITING: SaveState = { kind: "writing" };

/**
 * The host's `saveFile`, which downloads an export once its writer has
 * finished writing it, and its `canSave`.
 *
 * One at a time. An export asked for while a writer is still writing the
 * last is dropped and logged, and the export command that asked for it did
 * not run, so pressing a slow export twice saves one file, and reports one
 * command, rather than two. The export command asks `canSave` before it
 * builds its file, so a dropped export never runs its writer. A writer that
 * fails, or a download the browser refuses, is logged for the developer and
 * announced for the user, who asked for a file that will not come.
 */
export default function useSaveFile({
  messages,
  announce,
}: UseSaveFileOptions): Pick<GridCommandHost, "saveFile" | "canSave"> {
  const state = useRef<SaveState>(IDLE);

  /**
   * Whether a file asked for now would be saved. An export asks just before
   * it would build its file, so a refusal is that export dropped, and logged.
   */
  function canSave(): boolean {
    if (state.current.kind === "writing") {
      console.error(
        "DataGrid: an export is still being written, so this one was dropped.",
      );
      return false;
    }
    return true;
  }

  function fail(reason: string, error: unknown): void {
    console.error(`DataGrid: ${reason}`, error);
    announce(messages.exportFailed);
  }

  function download(file: ExportFile): void {
    try {
      downloadBlob(exportBlob(file), file.fileName);
    } catch (error) {
      fail("the export could not be saved.", error);
    }
  }

  function saveFile(file: ExportFile | Promise<ExportFile>): boolean {
    if (!canSave()) {
      return false;
    }
    if (!(file instanceof Promise)) {
      download(file);
      return true;
    }
    state.current = WRITING;
    file
      .then(download, (error: unknown) => {
        fail("the export's writer failed.", error);
      })
      .finally(() => {
        state.current = IDLE;
      });
    return true;
  }

  return { saveFile, canSave };
}
