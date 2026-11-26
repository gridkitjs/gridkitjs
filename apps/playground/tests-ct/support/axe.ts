import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "./coverage";

/**
 * The grid, from its toolbar to its pager, and the menus and panels it
 * portals into `document.body`, outside it.
 */
const GRID_SCOPE = [".gridkit-data-grid-viewport", ".gridkit-overlay"];

/** Every form on the page, and every forms field outside one. */
export const FORMS_SCOPE = [".gridkit-forms-form", ".gridkit-forms-field"];

/**
 * Runs axe with its default rules over every element `scope` matches, and
 * fails naming each violated rule and the elements that break it. A selector
 * matching nothing, such as the overlay while no menu is open, is skipped.
 */
export async function expectNoAxeViolations(
  page: Page,
  scope: readonly string[] = GRID_SCOPE,
): Promise<void> {
  const builder = new AxeBuilder({ page });
  for (const selector of scope) {
    if ((await page.locator(selector).count()) > 0) {
      builder.include(selector);
    }
  }
  const results = await builder.analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}
