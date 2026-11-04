import type { CopyContent, GridMessages } from "@gridkitjs/core";
import { writeClipboard } from "@gridkitjs/dom";

interface CopyToClipboardOptions {
  messages: GridMessages;
  announce: (text: string) => void;
}

/**
 * The host's `writeClipboard`: puts a copy on the clipboard and says so, as
 * nothing on screen does. A copy the browser refuses is logged for the
 * developer and announced for the user, who would otherwise paste whatever
 * the clipboard held before.
 */
export function copyToClipboard(
  content: CopyContent,
  { messages, announce }: CopyToClipboardOptions,
): void {
  writeClipboard(content).then(
    () => {
      announce(messages.copied(content.count, content.unit));
    },
    (error: unknown) => {
      console.error("DataGrid: the clipboard could not be written.", error);
      announce(messages.copyFailed);
    },
  );
}
