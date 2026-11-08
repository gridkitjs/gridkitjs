import { useEffect, useState } from "react";

/** An announcement of a change, waiting for the render that draws it. */
export interface DrawnAnnouncement {
  /** Whether the grid holds the change, which a controlled one may not. */
  readonly drawn: () => boolean;
  /** Its text, read once the rows are drawn, so the counts are theirs. */
  readonly text: () => string;
}

/**
 * Announces a change once the grid has drawn it. The returned function
 * takes the announcement as the change is asked for; the render that
 * follows announces it if the grid then holds the change, and drops it if
 * not — a controlled grid that didn't take it — so it never fires at a
 * later render that happens to hold the same thing.
 */
export default function useAnnounceWhenDrawn(
  announce: (text: string) => void,
): (requested: DrawnAnnouncement) => void {
  const [requested, setRequested] = useState<DrawnAnnouncement | null>(null);

  useEffect(() => {
    if (requested?.drawn() === true) {
      announce(requested.text());
    }
  }, [requested, announce]);

  return setRequested;
}
