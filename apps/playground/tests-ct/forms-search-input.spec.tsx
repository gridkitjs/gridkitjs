// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Locator } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";
import SearchInputHarness from "./support/forms/SearchInputHarness";

/** Long enough that a test's next step lands well inside it in every browser. */
const DEBOUNCE = 600;

function searchBox(root: MountResult): Locator {
  return root.getByRole("searchbox", { name: "Search orders" });
}

async function eventNames(root: MountResult): Promise<string[]> {
  return (await loggedEvents(root)).map((event) => event.name);
}

test.describe("SearchInput", () => {
  test("is a search box with a search icon, a search key and a placeholder", async ({
    mount,
  }) => {
    const root = await mount(<SearchInputHarness />);

    await expect(searchBox(root)).toHaveAttribute("type", "search");
    await expect(searchBox(root)).toHaveAttribute("enterkeyhint", "search");
    await expect(searchBox(root)).toHaveAttribute("placeholder", "Search");
    await expect(
      root.locator(".gridkit-forms-control .gridkit-forms-search-input-icon"),
    ).toHaveAttribute("aria-hidden", "true");
  });

  test("without a debounce, every keystroke changes the value at once", async ({
    mount,
    page,
  }) => {
    const root = await mount(<SearchInputHarness />);
    await searchBox(root).click();
    await page.keyboard.type("ab");

    const changes = (await loggedEvents(root)).filter(
      (event) => event.name === "onChange",
    );
    expect(changes.map((event) => event.value)).toEqual(["a", "ab"]);
  });

  test("a debounce fires onInput at once and onChange once typing pauses", async ({
    mount,
    page,
  }) => {
    const root = await mount(<SearchInputHarness debounce={DEBOUNCE} />);
    await searchBox(root).click();
    await page.keyboard.type("ab");

    expect(await eventNames(root)).toEqual(["onInput", "onInput"]);
    await expect(eventItems(root).last()).toHaveText("onValidate typing");
    const changes = (await loggedEvents(root)).filter(
      (event) => event.name === "onChange",
    );
    expect(changes).toMatchObject([{ value: "ab", previousValue: null }]);
  });

  test("Enter reads the text at once, cancelling the pending debounce", async ({
    mount,
    page,
  }) => {
    const root = await mount(<SearchInputHarness debounce={DEBOUNCE} />);
    await searchBox(root).click();
    await page.keyboard.type("ab");
    await page.keyboard.press("Enter");

    await expect(eventItems(root).last()).toHaveText("onCommit typing enter");
    await page.waitForTimeout(DEBOUNCE + 200);
    expect(await eventNames(root)).toEqual([
      "onInput",
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeCommit",
      "onCommit",
    ]);
  });

  test("Escape fires onClear, then clears and commits, and takes the key", async ({
    mount,
    page,
  }) => {
    const root = await mount(<SearchInputHarness defaultValue="Ada" />);
    await searchBox(root).click();
    await page.keyboard.press("Escape");

    await expect(searchBox(root)).toHaveValue("");
    await expect(eventItems(root)).toHaveText([
      "onClear",
      "onInput clear",
      "onBeforeChange clear",
      "onChange clear",
      "onValidate clear",
      "onBeforeCommit clear clear",
      "onCommit clear clear",
    ]);
    expect((await loggedEvents(root))[0]).toMatchObject({
      previousValue: "Ada",
      native: "keydown",
    });
    await expect(root.getByTestId("escapes")).toHaveText("Escape passed 0");
  });

  test("Escape in an empty search box passes on", async ({ mount, page }) => {
    const root = await mount(<SearchInputHarness />);
    await searchBox(root).click();
    await page.keyboard.press("Escape");

    await expect(root.getByTestId("escapes")).toHaveText("Escape passed 1");
    expect(await eventNames(root)).toEqual([]);
  });

  test("Escape in a read-only search box clears nothing", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <SearchInputHarness defaultValue="Ada" readOnly />,
    );
    await searchBox(root).click();
    await page.keyboard.press("Escape");

    await expect(searchBox(root)).toHaveValue("Ada");
    await expect(root.getByTestId("escapes")).toHaveText("Escape passed 1");
  });

  test("is clearable by default", async ({ mount }) => {
    const root = await mount(<SearchInputHarness defaultValue="Ada" />);
    await root.getByRole("button", { name: "Clear", exact: true }).click();

    await expect(searchBox(root)).toHaveValue("");
    expect((await eventNames(root))[0]).toBe("onClear");
  });

  test("unmounting releases a pending debounce", async ({ mount, page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const root = await mount(<SearchInputHarness debounce={DEBOUNCE} />);
    await searchBox(root).click();
    await page.keyboard.type("ab");

    await root.getByRole("button", { name: "Remove" }).click();
    await expect(searchBox(root)).toHaveCount(0);
    await page.waitForTimeout(DEBOUNCE + 200);

    expect(await eventNames(root)).not.toContain("onChange");
    expect(errors).toEqual([]);
  });

  test("display mode shows the text", async ({ mount }) => {
    const root = await mount(
      <SearchInputHarness mode="display" defaultValue="Ada" />,
    );

    await expect(root.locator(".gridkit-forms-display-value")).toHaveText(
      "Ada",
    );
    await expect(searchBox(root)).toHaveCount(0);
  });
});
