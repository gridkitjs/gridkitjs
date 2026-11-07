import { useEffect, useRef, useState } from "react";
import {
  searchTextOf,
  setSearchText,
  type GridMessages,
  type ToolbarItemAttributes,
} from "@gridkitjs/core";
import type { DataGridController } from "../useGridController";

/** How long typing has to rest before the search applies. */
const SEARCH_DELAY_MS = 250;

/** What the user has typed and the grid not yet applied. */
interface Draft {
  readonly text: string;
  /**
   * The search applied when it was typed. Once the search changes from
   * elsewhere — "Clear filters", a restored layout — the draft is dropped
   * and the box shows that instead.
   */
  readonly over: string;
}

interface ToolbarSearchProps<Row> {
  /** Its `data-gridkit-toolbar-item`. */
  itemKey: string;
  /** The app's attributes for the box, under the box's own. */
  attributes: ToolbarItemAttributes | undefined;
  controller: DataGridController<Row>;
  messages: GridMessages;
  announce: (text: string) => void;
}

/**
 * The toolbar's search box, over the filter's global text entry — the one
 * naming no column — through `@gridkitjs/core`'s `searchTextOf` and
 * `setSearchText`. It reads what it shows back from the filter, so anything
 * else that changes the search changes the box.
 *
 * Typing applies once it rests for a moment; Enter applies at once, and
 * Escape empties the box. A search the box applied is announced as the
 * number of rows it found, once the grid has drawn them.
 */
export default function ToolbarSearch<Row>({
  itemKey,
  attributes,
  controller,
  messages,
  announce,
}: ToolbarSearchProps<Row>) {
  const applied = searchTextOf(controller.getState().filter);
  const [draft, setDraft] = useState<Draft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** The search this box applied, until it is announced. */
  const unannounced = useRef<string | null>(null);
  const text = draft !== null && draft.over === applied ? draft.text : applied;

  /** Applies `next`, typed over the search `over`, unless that has changed since. */
  function apply(next: string, over: string): void {
    clearTimeout(timer.current);
    setDraft(null);
    const filter = controller.getState().filter;
    if (searchTextOf(filter) !== over) {
      return;
    }
    const searched = setSearchText(filter, next);
    if (searched !== filter) {
      unannounced.current = next;
      controller.setFilter(searched);
    }
  }

  // After the render that drew the rows, so the count is theirs — and only
  // once the filter holds the search, which a controlled one may not.
  useEffect(() => {
    if (unannounced.current === applied) {
      unannounced.current = null;
      announce(messages.searchResults(controller.getView().rows.length));
    }
  });

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  return (
    <input
      {...attributes}
      type="search"
      className="toolbar-search"
      data-gridkit-toolbar-item={itemKey}
      aria-label={messages.searchLabel}
      placeholder={messages.searchPlaceholder}
      value={text}
      onChange={(event) => {
        const typed = event.target.value;
        setDraft({ text: typed, over: applied });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          apply(typed, applied);
        }, SEARCH_DELAY_MS);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          apply(text, applied);
        } else if (event.key === "Escape" && text !== "") {
          // Ahead of the browser's own clearing, which would wait out the delay.
          event.preventDefault();
          apply("", applied);
        }
      }}
    />
  );
}
