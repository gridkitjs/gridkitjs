// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { compose } from "./support/forms/compose";
import FieldInputHarness from "./support/forms/FieldInputHarness";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";

function nameField(root: MountResult) {
  return root.getByRole("textbox", { name: "Name" });
}

/** Focuses the field, types `text`, then empties the log for the action under test. */
async function typeThenClear(
  root: MountResult,
  page: Page,
  text: string,
): Promise<void> {
  await nameField(root).click();
  await page.keyboard.type(text);
  await root.getByRole("button", { name: "Clear events" }).click();
  await expect(eventItems(root)).toHaveCount(0);
}

/** What a text edit fires, every step, for a source. */
function editSequence(source: string): string[] {
  return [
    `onBeforeInput ${source}`,
    `onInput ${source}`,
    `onBeforeChange ${source}`,
    `onChange ${source}`,
    `onValidate ${source}`,
  ];
}

test.describe("the order a text field's events fire in", () => {
  test("a keystroke: focus, then the edit, the change and validation", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness />);

    await nameField(root).click();
    await page.keyboard.type("a");

    await expect(eventItems(root)).toHaveText([
      "onFocus",
      ...editSequence("typing"),
    ]);
    expect(await loggedEvents(root)).toMatchObject([
      { value: null, text: "", native: "focus" },
      {
        value: null,
        previousValue: null,
        text: "a",
        previousText: "",
        inputType: "insertText",
        data: "a",
        isComposing: false,
        cancelable: true,
        native: "beforeinput",
      },
      {
        value: null,
        previousValue: null,
        text: "a",
        previousText: "",
        inputType: "insertText",
        data: "a",
        native: "input",
      },
      { value: "a", previousValue: null, text: "a", previousText: "" },
      { value: "a", previousValue: null, text: "a", native: "input" },
      { value: "a", valid: true, native: "input" },
    ]);
  });

  test("a paste: the pasted text, read once", async ({ mount, page }) => {
    const root = await mount(<FieldInputHarness />);
    const next = root.getByRole("textbox", { name: "Next" });
    await next.fill("Ada");
    await next.selectText();
    await page.keyboard.press("ControlOrMeta+c");

    await nameField(root).click();
    await page.keyboard.press("ControlOrMeta+v");

    await expect(eventItems(root)).toHaveText([
      "onFocus",
      ...editSequence("paste"),
    ]);
    expect((await loggedEvents(root)).slice(1, 3)).toMatchObject([
      { text: "Ada", inputType: "insertFromPaste", data: "Ada" },
      { text: "Ada", inputType: "insertFromPaste", native: "input" },
    ]);
  });

  test("a drop: the dropped text", async ({ mount }) => {
    const root = await mount(<FieldInputHarness />);
    await nameField(root).click();

    // Playwright cannot drag a text selection, and a dispatched `drop`
    // inserts nothing, so the field gets the input events a drop fires.
    await nameField(root).evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) {
        return;
      }
      const init = { bubbles: true, inputType: "insertFromDrop", data: "Ada" };
      element.dispatchEvent(
        new InputEvent("beforeinput", { ...init, cancelable: true }),
      );
      element.value = "Ada";
      element.dispatchEvent(new InputEvent("input", init));
    });

    await expect(eventItems(root)).toHaveText([
      "onFocus",
      ...editSequence("drop"),
    ]);
    expect((await loggedEvents(root)).slice(1, 3)).toMatchObject([
      { text: "Ada", inputType: "insertFromDrop", data: "Ada" },
      { text: "Ada", inputType: "insertFromDrop", data: "Ada" },
    ]);
  });

  test("a deletion: the text it would leave, then the change", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness />);
    await typeThenClear(root, page, "ab");

    await page.keyboard.press("Backspace");

    await expect(eventItems(root)).toHaveText(editSequence("typing"));
    expect(await loggedEvents(root)).toMatchObject([
      {
        text: "a",
        previousText: "ab",
        inputType: "deleteContentBackward",
        data: null,
      },
      { text: "a", previousText: "ab" },
      { value: "a", previousValue: "ab" },
      { value: "a", previousValue: "ab" },
      { value: "a" },
    ]);
  });

  test("undo: the browser's own edit, from the source `undo`", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness />);
    await typeThenClear(root, page, "ab");

    await page.keyboard.press("ControlOrMeta+z");

    await expect(eventItems(root)).toHaveText(editSequence("undo"));
    const [before, input] = await loggedEvents(root);
    // Only the browser knows what an undo leaves, so the text before it
    // stands in for the proposed text.
    expect(before).toMatchObject({ text: "ab", inputType: "historyUndo" });
    expect(input).toMatchObject({
      text: await nameField(root).inputValue(),
      inputType: "historyUndo",
    });
  });

  test("Enter commits, and focus stays", async ({ mount, page }) => {
    const root = await mount(<FieldInputHarness />);
    await typeThenClear(root, page, "a");

    await page.keyboard.press("Enter");

    await expect(eventItems(root)).toHaveText([
      "onBeforeCommit typing enter",
      "onCommit typing enter",
    ]);
    expect(await loggedEvents(root)).toMatchObject([
      {
        value: "a",
        previousValue: null,
        initialValue: null,
        changed: true,
        native: "keydown",
      },
      { value: "a", previousValue: null, changed: true, native: "keydown" },
    ]);
    await expect(nameField(root)).toBeFocused();
  });

  test("Tab commits, then the field blurs", async ({ mount, page }) => {
    const root = await mount(<FieldInputHarness />);
    await typeThenClear(root, page, "a");

    await page.keyboard.press("Tab");

    await expect(eventItems(root)).toHaveText([
      "onBeforeCommit typing tab",
      "onCommit typing tab",
      "onBlur",
    ]);
    expect((await loggedEvents(root)).map((event) => event.native)).toEqual([
      "keydown",
      "keydown",
      "blur",
    ]);
    await expect(root.getByRole("textbox", { name: "Next" })).toBeFocused();
  });

  test("leaving by a click commits, then the field blurs", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness />);
    await typeThenClear(root, page, "a");

    await root.getByRole("textbox", { name: "Next" }).click();

    await expect(eventItems(root)).toHaveText([
      "onBeforeCommit typing blur",
      "onCommit typing blur",
      "onBlur",
    ]);
    expect((await loggedEvents(root)).map((event) => event.native)).toEqual([
      "blur",
      "blur",
      "blur",
    ]);
  });

  test("Enter, then leaving, is two commits", async ({ mount, page }) => {
    const root = await mount(<FieldInputHarness />);
    await typeThenClear(root, page, "a");

    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");

    await expect(eventItems(root)).toHaveText([
      "onBeforeCommit typing enter",
      "onCommit typing enter",
      "onBeforeCommit typing tab",
      "onCommit typing tab",
      "onBlur",
    ]);
    expect((await loggedEvents(root))[3]).toMatchObject({
      value: "a",
      previousValue: "a",
      changed: false,
    });
  });

  test("Escape puts back the last commit, as an edit from `revert`", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness />);
    await nameField(root).click();
    await page.keyboard.type("a");
    await page.keyboard.press("Enter");
    await typeThenClear(root, page, "b");

    await page.keyboard.press("Escape");

    await expect(eventItems(root)).toHaveText([
      "onInput revert",
      "onBeforeChange revert",
      "onChange revert",
      "onValidate revert",
    ]);
    expect((await loggedEvents(root))[2]).toMatchObject({
      value: "a",
      previousValue: "ab",
      text: "a",
      previousText: "ab",
      native: "keydown",
    });
    await expect(nameField(root)).toHaveValue("a");
  });

  test("a waiting check holds the commit, and Tab's blur waits for it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness check="wait" />);
    await typeThenClear(root, page, "a");

    await page.keyboard.press("Tab");
    await expect(eventItems(root)).toHaveText(["onBeforeCommit typing tab"]);
    await expect(root.getByRole("textbox", { name: "Next" })).toBeFocused();

    await root.getByRole("button", { name: "Allow the check" }).click();
    await expect(eventItems(root)).toHaveText([
      "onBeforeCommit typing tab",
      "onCommit typing tab",
      "onBlur",
    ]);
  });

  test("a check that refuses at once keeps focus on Tab and shows why", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness check="refuse" />);
    await typeThenClear(root, page, "a");

    await page.keyboard.press("Tab");

    await expect(eventItems(root)).toHaveText(["onBeforeCommit typing tab"]);
    await expect(nameField(root)).toBeFocused();
    await expect(root.getByRole("list", { name: "Name messages" })).toHaveText(
      "That name is taken",
    );
    await expect(nameField(root)).toHaveAttribute("aria-invalid", "true");
  });

  test("composing: every update reported, the text read once at the end", async ({
    mount,
    page,
    browserName,
  }) => {
    const root = await mount(<FieldInputHarness />);
    await nameField(root).click();

    await compose(page, browserName, nameField(root), ["に", "にほ"], "日本");

    await expect(nameField(root)).toHaveValue("日本");
    await expect(eventItems(root).last()).toHaveText("onValidate typing");
    const events = await loggedEvents(root);
    const names = events.map((event) => event.name);
    expect(names.filter((name) => name === "onChange")).toHaveLength(1);
    expect(names.indexOf("onBeforeChange")).toBeGreaterThan(
      names.lastIndexOf("onInput"),
    );
    expect(
      events
        .filter((event) => event.name === "onInput")
        .map((event) => [event.text, event.isComposing]),
    ).toEqual([
      ["に", true],
      ["にほ", true],
      ["日本", true],
    ]);
    expect(
      events
        .filter((event) => event.name === "onBeforeInput")
        .every((event) => event.cancelable === false),
    ).toBe(true);
    expect(events.find((event) => event.name === "onChange")).toMatchObject({
      value: "日本",
      previousValue: null,
      source: "typing",
      native: "compositionend",
    });
  });

  // Firefox enters `fill`'s text as a composition committed in one step and
  // fires its last `input` after `compositionend`; the text must survive.
  test("a fill: the text is read once and kept when the field is left", async ({
    mount,
  }) => {
    const root = await mount(<FieldInputHarness name="name" />);

    await nameField(root).fill("Ada");
    await root.getByRole("textbox", { name: "Next" }).click();

    await expect(nameField(root)).toHaveValue("Ada");
    await expect(eventItems(root).last()).toHaveText("onBlur");
    const events = await loggedEvents(root);
    expect(events.filter((event) => event.name === "onChange")).toMatchObject([
      { value: "Ada", previousValue: null, source: "typing" },
    ]);
    expect(events.find((event) => event.name === "onCommit")).toMatchObject({
      value: "Ada",
      trigger: "blur",
    });
  });
});
