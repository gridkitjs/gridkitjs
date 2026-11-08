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
 * The host's `saveFile`: downloads an export, once its writer has finished
 * writing it.
 *
 * One at a time. An export asked for while a writer is still writing the
 * last is dropped and logged, so pressing a slow export twice saves one file
 * rather than two. A writer that fails, or a download the browser refuses,
 * is logged for the developer and announced for the user, who asked for a
 * file that will not come.
 */
export default function useSaveFile({
  messages,
  announce,
}: UseSaveFileOptions): GridCommandHost["saveFile"] {
  const state = useRef<SaveState>(IDLE);

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

  return (file) => {
    if (state.current.kind === "writing") {
      console.error(
        "DataGrid: an export is still being written, so this one was dropped.",
      );
      return;
    }
    if (!(file instanceof Promise)) {
      download(file);
      return;
    }
    state.current = WRITING;
    file
      .then(download, (error: unknown) => {
        fail("the export's writer failed.", error);
      })
      .finally(() => {
        state.current = IDLE;
      });
  };
}
