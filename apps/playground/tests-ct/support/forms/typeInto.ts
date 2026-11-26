import type { Locator } from "@playwright/test";

/**
 * Types `text` into an empty forms control key by key, as a user would, so
 * the field sees a keystroke's events in every browser. Playwright's `fill`
 * enters text in Firefox as a composition committed in one step, which
 * only `forms-events.spec.tsx` needs to see.
 */
export async function typeInto(control: Locator, text: string): Promise<void> {
  await control.click();
  await control.pressSequentially(text);
}
