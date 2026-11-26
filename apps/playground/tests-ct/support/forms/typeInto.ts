import type { Locator } from "@playwright/test";

/**
 * Types `text` into an empty forms control key by key. Playwright's `fill`
 * enters text in Firefox as a committed composition, whose events Firefox
 * orders differently from a typed key, so a test about something else
 * types instead.
 */
export async function typeInto(control: Locator, text: string): Promise<void> {
  await control.click();
  await control.pressSequentially(text);
}
