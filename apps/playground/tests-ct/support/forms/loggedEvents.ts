import type { Locator } from "@playwright/test";
import type { LoggedEvent } from "./EventLog";

/** The event log's items, which read as each handler's name with its source or trigger. */
export function eventItems(root: Locator): Locator {
  return root.getByRole("list", { name: "Events" }).getByRole("listitem");
}

/** Every event the log holds, oldest first, with all its fields. */
export async function loggedEvents(root: Locator): Promise<LoggedEvent[]> {
  const items = await eventItems(root).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-event") ?? "{}"),
  );
  return items.map((item) => JSON.parse(item) as LoggedEvent);
}
