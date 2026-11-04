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

function download(file: ExportFile): void {
  downloadBlob(exportBlob(file), file.fileName);
}

/**
 * The host's `saveFile`: downloads an export, once its writer has finished
 * writing it.
 *
 * One at a time. An export asked for while a writer is still writing the
 * last is dropped and logged, so pressing a slow export twice saves one file
 * rather than two. A writer that fails is logged for the developer and
 * announced for the user, who asked for a file that will not come.
 */
export default function useSaveFile({
  messages,
  announce,
}: UseSaveFileOptions): GridCommandHost["saveFile"] {
  const writingRef = useRef(false);

  return (file) => {
    if (writingRef.current) {
      console.error(
        "DataGrid: an export is still being written, so this one was dropped.",
      );
      return;
    }
    if (!(file instanceof Promise)) {
      download(file);
      return;
    }
    writingRef.current = true;
    file
      .then(download, (error: unknown) => {
        console.error("DataGrid: the export's writer failed.", error);
        announce(messages.exportFailed);
      })
      .finally(() => {
        writingRef.current = false;
      });
  };
}
