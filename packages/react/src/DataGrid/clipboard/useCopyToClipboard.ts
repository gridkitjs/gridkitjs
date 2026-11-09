import { useRef } from "react";
import type { GridCommandHost, GridMessages } from "@gridkitjs/core";
import { writeClipboard } from "@gridkitjs/dom";

interface UseCopyToClipboardOptions {
  messages: GridMessages;
  announce: (text: string) => void;
}

/**
 * The host's `writeClipboard`: puts a copy on the clipboard and says so, as
 * nothing on screen does. A copy the browser refuses is logged for the
 * developer and announced for the user, who would otherwise paste whatever
 * the clipboard held before.
 *
 * Only the latest copy is announced. A write cannot be called off, so one
 * finishing after a later copy began says nothing, rather than telling the
 * user they hold what they copied before.
 */
export default function useCopyToClipboard({
  messages,
  announce,
}: UseCopyToClipboardOptions): GridCommandHost["writeClipboard"] {
  /** How many copies have begun: the number of the latest. */
  const copies = useRef(0);

  return (content) => {
    copies.current += 1;
    const copy = copies.current;
    function announceIfLatest(text: string): void {
      if (copy === copies.current) {
        announce(text);
      }
    }
    writeClipboard(content).then(
      () => {
        announceIfLatest(messages.copied(content.count, content.unit));
      },
      (error: unknown) => {
        console.error("DataGrid: the clipboard could not be written.", error);
        announceIfLatest(messages.copyFailed);
      },
    );
  };
}
