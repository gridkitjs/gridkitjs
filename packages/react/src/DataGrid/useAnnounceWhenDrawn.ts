import { useEffect, useRef, useState } from "react";
import type { DataGridController } from "./useGridController";

/** An announcement of a change, waiting for the render that draws it. */
export interface DrawnAnnouncement {
  /** Whether the grid holds the change, which a controlled one may not. */
  readonly drawn: () => boolean;
  /** Its text, read once the rows are drawn, so the counts are theirs. */
  readonly text: () => string;
}

/** An announcement as it was asked for, with the rows the grid held then. */
interface Request<Row> {
  readonly announcement: DrawnAnnouncement;
  readonly rowsAsked: readonly Row[] | undefined;
}

/**
 * Announces a change once the grid has drawn it. The returned function
 * takes the announcement as the change is asked for; the render that
 * follows announces it if the grid then holds the change, and drops it if
 * not — a controlled grid that didn't take it — so it never fires at a
 * later render that happens to hold the same thing.
 *
 * Under `dataMode: "server"` the rows the change asks for are the server's
 * to send, so the announcement waits for them: for the first render after
 * the request whose `dataSource` is another array than the one held then,
 * while `loading` is off. It is dropped if the grid stops holding the
 * change meanwhile, and a newer request replaces it.
 */
export default function useAnnounceWhenDrawn<Row>(
  announce: (text: string) => void,
  controller: DataGridController<Row>,
): (requested: DrawnAnnouncement) => void {
  const [requested, setRequested] = useState<Request<Row> | null>(null);
  /** The request already announced or dropped, which renders after it skip. */
  const settled = useRef<Request<Row> | null>(null);
  const { dataMode, dataSource, loading = false } = controller.getOptions();

  useEffect(() => {
    if (requested === null || settled.current === requested) {
      return;
    }
    const { announcement, rowsAsked } = requested;
    const awaitingRows =
      dataMode === "server" && (loading || dataSource === rowsAsked);
    const drawn = announcement.drawn();
    if (drawn && awaitingRows) {
      return;
    }
    settled.current = requested;
    if (drawn) {
      announce(announcement.text());
    }
  }, [requested, dataMode, dataSource, loading, announce]);

  return (announcement) => {
    setRequested({
      announcement,
      rowsAsked: controller.getOptions().dataSource,
    });
  };
}

/**
 * How many rows a search or filter found: the rows it keeps, or under
 * `dataMode: "server"` the server's `rowCount` for it.
 */
export function resultCount<Row>(controller: DataGridController<Row>): number {
  const { dataMode, rowCount } = controller.getOptions();
  const held = controller.getView().rows.length;
  return dataMode === "server" ? (rowCount ?? held) : held;
}
