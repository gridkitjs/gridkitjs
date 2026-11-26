import type { Locator, Page } from "@playwright/test";

/**
 * Types `committed` into the focused `control` through an input method,
 * showing each of `updates` while it composes.
 *
 * Chromium composes for real, through the DevTools protocol's input method
 * emulation. Playwright has no input method for Firefox or WebKit, so there
 * the events a composition fires are dispatched instead, in the order
 * Chromium fires them: `compositionstart`, then for each text a
 * `beforeinput` and an `input` with `isComposing`, then `compositionend`.
 */
export async function compose(
  page: Page,
  browserName: string,
  control: Locator,
  updates: readonly string[],
  committed: string,
): Promise<void> {
  if (browserName === "chromium") {
    const session = await page.context().newCDPSession(page);
    for (const text of updates) {
      await session.send("Input.imeSetComposition", {
        text,
        selectionStart: text.length,
        selectionEnd: text.length,
      });
    }
    await session.send("Input.insertText", { text: committed });
    await session.detach();
    return;
  }
  await control.evaluate(
    (element, texts) => {
      if (!(element instanceof HTMLInputElement)) {
        throw new Error("compose needs an <input>");
      }
      const start = element.selectionStart ?? element.value.length;
      const end = element.selectionEnd ?? start;
      const before = element.value.slice(0, start);
      const after = element.value.slice(end);
      element.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true, data: "" }),
      );
      for (const text of texts) {
        element.dispatchEvent(
          new CompositionEvent("compositionupdate", {
            bubbles: true,
            data: text,
          }),
        );
        element.dispatchEvent(
          new InputEvent("beforeinput", {
            bubbles: true,
            inputType: "insertCompositionText",
            data: text,
            isComposing: true,
          }),
        );
        element.value = before + text + after;
        const caret = before.length + text.length;
        element.setSelectionRange(caret, caret);
        element.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertCompositionText",
            data: text,
            isComposing: true,
          }),
        );
      }
      element.dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: texts.at(-1) ?? "",
        }),
      );
    },
    [...updates, committed],
  );
}
