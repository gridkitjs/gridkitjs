// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import ControlledInput from "./support/forms/ControlledInput";
import FieldInputHarness from "./support/forms/FieldInputHarness";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";

function nameField(root: MountResult) {
  return root.getByRole("textbox", { name: "Name" });
}

function hiddenInput(root: MountResult) {
  return root.locator('input[type="hidden"]');
}

async function clearEvents(root: MountResult): Promise<void> {
  await root.getByRole("button", { name: "Clear events" }).click();
  await expect(eventItems(root)).toHaveCount(0);
}

const API_CHANGE = ["onBeforeChange api", "onChange api", "onValidate api"];

/**
 * Starts counting the `reset` listeners added to the document from now on,
 * and returns a reader for how many are still attached. A listener added
 * with a `signal` counts until the signal aborts.
 */
async function trackResetListeners(page: Page): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const listeners = new Set<unknown>();
    const add: EventTarget["addEventListener"] =
      document.addEventListener.bind(document);
    const remove: EventTarget["removeEventListener"] =
      document.removeEventListener.bind(document);
    Object.assign(window, { resetListeners: listeners });
    Object.assign(document, {
      addEventListener(
        ...args: Parameters<EventTarget["addEventListener"]>
      ): void {
        const [type, listener, options] = args;
        if (type === "reset") {
          listeners.add(listener);
          if (typeof options === "object") {
            options.signal?.addEventListener("abort", () => {
              listeners.delete(listener);
            });
          }
        }
        add(...args);
      },
      removeEventListener(
        ...args: Parameters<EventTarget["removeEventListener"]>
      ): void {
        if (args[0] === "reset") {
          listeners.delete(args[1]);
        }
        remove(...args);
      },
    });
  });
  return () =>
    page.evaluate(
      () =>
        (window as unknown as { resetListeners: Set<unknown> }).resetListeners
          .size,
    );
}

test.describe("an uncontrolled field", () => {
  test("starts from `defaultValue` and submits its value through the hidden input", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <FieldInputHarness defaultValue="Ada" name="name" />,
    );
    await expect(nameField(root)).toHaveValue("Ada");
    await expect(nameField(root)).not.toHaveAttribute("name");

    await nameField(root).click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Lovelace");
    await expect(hiddenInput(root)).toHaveValue("Ada Lovelace");
    await root.getByRole("button", { name: "Submit" }).click();

    await expect(root.getByTestId("submitted")).toHaveText(
      '[["name","Ada Lovelace"]]',
    );
  });

  test("submits an empty field as an empty string", async ({ mount }) => {
    const root = await mount(<FieldInputHarness name="name" />);

    await root.getByRole("button", { name: "Submit" }).click();

    await expect(root.getByTestId("submitted")).toHaveText('[["name",""]]');
  });

  test("an error keeps a plain form from submitting until it is fixed", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness name="name" required />);
    await expect(nameField(root)).toHaveJSProperty(
      "validationMessage",
      "Enter a value",
    );

    await root.getByRole("button", { name: "Submit" }).click();
    await expect(root.getByTestId("submitted")).toHaveText("none");

    await nameField(root).click();
    await page.keyboard.type("Ada");
    await expect(nameField(root)).toHaveJSProperty("validationMessage", "");
    await root.getByRole("button", { name: "Submit" }).click();
    await expect(root.getByTestId("submitted")).toHaveText('[["name","Ada"]]');
  });

  test("`revealMessages` shows the messages a commit attempt would", async ({
    mount,
  }) => {
    const root = await mount(<FieldInputHarness required />);
    const messages = root.getByRole("list", { name: "Name messages" });
    await expect(messages.getByRole("listitem")).toHaveCount(0);

    await root.getByRole("button", { name: "Reveal messages" }).click();

    await expect(messages).toHaveText("Enter a value");
    await expect(nameField(root)).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("changes from code", () => {
  test("`setValue` fires the change events from `api`, and no commit", async ({
    mount,
  }) => {
    const root = await mount(<FieldInputHarness defaultValue="Ada" />);

    await root.getByRole("button", { name: "Set to Grace" }).click();

    await expect(eventItems(root)).toHaveText(API_CHANGE);
    expect(await loggedEvents(root)).toMatchObject([
      { value: "Grace", previousValue: "Ada", native: null },
      { value: "Grace", previousValue: "Ada", text: "Grace", native: null },
      { value: "Grace", valid: true, native: null },
    ]);
    await expect(nameField(root)).toHaveValue("Grace");
  });

  test("`reset` goes back to `defaultValue`", async ({ mount, page }) => {
    const root = await mount(
      <FieldInputHarness defaultValue="Ada" name="name" />,
    );
    await nameField(root).click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");
    await clearEvents(root);

    await root.getByRole("button", { name: "Reset field" }).click();

    await expect(eventItems(root)).toHaveText(API_CHANGE);
    await expect(nameField(root)).toHaveValue("Ada");
    await expect(hiddenInput(root)).toHaveValue("Ada");
  });

  test("the form's reset resets the field, from `api`", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <FieldInputHarness defaultValue="Ada" name="name" />,
    );
    await nameField(root).click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");
    await root.getByRole("textbox", { name: "Next" }).click();
    await clearEvents(root);

    await root.getByRole("button", { name: "Reset form" }).click();

    await expect(eventItems(root)).toHaveText(API_CHANGE);
    await expect(nameField(root)).toHaveValue("Ada");
    await expect(hiddenInput(root)).toHaveValue("Ada");
  });
});

test.describe("a controlled field", () => {
  test("shows the app's value and follows it silently", async ({ mount }) => {
    const root = await mount(<ControlledInput initialValue="Ada" />);
    await expect(nameField(root)).toHaveValue("Ada");

    await root.getByRole("button", { name: "Set to Grace" }).click();
    await expect(nameField(root)).toHaveValue("Grace");
    await root.getByRole("button", { name: "Set to empty" }).click();
    await expect(nameField(root)).toHaveValue("");

    await expect(eventItems(root)).toHaveCount(0);
  });

  test("reports each change for the app to take", async ({ mount, page }) => {
    const root = await mount(<ControlledInput initialValue="Ada" />);

    await nameField(root).click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");

    await expect(root.getByTestId("app-value")).toHaveText('"Adax"');
    await expect(eventItems(root)).toHaveText([
      "onFocus",
      "onInput typing",
      "onChange typing",
    ]);
  });

  test("a value the app sets while the user types waits for the edit to end", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ControlledInput initialValue="Ada" />);
    await nameField(root).click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");

    await root.getByRole("button", { name: "Set to Grace" }).click();
    await expect(nameField(root)).toHaveValue("Adax");

    await page.keyboard.press("Enter");
    await expect(nameField(root)).toHaveValue("Grace");
    expect((await loggedEvents(root)).at(-1)).toMatchObject({
      name: "onCommit",
      value: "Adax",
    });
  });

  test("an app that keeps its own value gets it back after the commit", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <ControlledInput initialValue="Ada" follow={false} />,
    );
    await nameField(root).click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");
    await expect(nameField(root)).toHaveValue("Adax");
    await expect(root.getByTestId("app-value")).toHaveText('"Ada"');

    await page.keyboard.press("Enter");

    await expect(nameField(root)).toHaveValue("Ada");
  });
});

test.describe("the caret", () => {
  test("stays where it was when a hook changes the text", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <FieldInputHarness defaultValue="ab cd" beforeChange="uppercase" />,
    );
    await nameField(root).click();
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    await page.keyboard.type("x");

    await expect(nameField(root)).toHaveValue("ABX CD");
    await expect(nameField(root)).toHaveJSProperty("selectionStart", 3);
    await expect(nameField(root)).toHaveJSProperty("selectionEnd", 3);
  });

  test("a refused change is put back with the selection it had", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <FieldInputHarness defaultValue="abcd" beforeChange="no-digits" />,
    );
    await nameField(root).click();
    await page.keyboard.press("Home");
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowRight");
    await clearEvents(root);

    await page.keyboard.type("1");

    await expect(nameField(root)).toHaveValue("abcd");
    await expect(nameField(root)).toHaveJSProperty("selectionStart", 0);
    await expect(nameField(root)).toHaveJSProperty("selectionEnd", 2);
    await expect(eventItems(root)).toHaveText([
      "onBeforeInput typing",
      "onInput typing",
      "onBeforeChange typing",
    ]);
  });

  test("text a hook inserts lands at the caret, and can be undone", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness upperCaseInput />);
    await nameField(root).click();

    await page.keyboard.type("a");

    await expect(nameField(root)).toHaveValue("A");
    await expect(nameField(root)).toHaveJSProperty("selectionStart", 1);
    expect((await loggedEvents(root)).slice(1, 3)).toMatchObject([
      { name: "onBeforeInput", data: "a", text: "a" },
      { name: "onInput", data: "A", text: "A", native: "beforeinput" },
    ]);

    await page.keyboard.press("ControlOrMeta+z");
    await expect(nameField(root)).toHaveValue("");
  });
});

test.describe("autofill", () => {
  test("text that changes while the field is not being edited is read and committed at once", async ({
    mount,
  }) => {
    const root = await mount(<FieldInputHarness />);

    // A browser filling a saved value sets the text and fires `input`
    // without focusing the field.
    await nameField(root).evaluate((element) => {
      if (element instanceof HTMLInputElement) {
        element.value = "Ada";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await expect(eventItems(root)).toHaveText([
      "onInput autofill",
      "onBeforeChange autofill",
      "onChange autofill",
      "onValidate autofill",
      "onBeforeCommit autofill autofill",
      "onCommit autofill autofill",
    ]);
    expect((await loggedEvents(root))[2]).toMatchObject({
      value: "Ada",
      previousValue: null,
      native: "input",
    });
  });
});

test.describe("the control", () => {
  test("`ref` is the native element", async ({ mount }) => {
    const input = await mount(<FieldInputHarness />);
    await expect(input.getByTestId("element")).toHaveText("input");
    await input.unmount();

    const textarea = await mount(<FieldInputHarness multiline />);
    await expect(textarea.getByTestId("element")).toHaveText("textarea");
  });

  test("a text area takes Enter as a new line and commits on Ctrl+Enter", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldInputHarness multiline />);
    await nameField(root).click();
    await page.keyboard.type("a");
    await page.keyboard.press("Enter");
    await page.keyboard.type("b");
    await expect(nameField(root)).toHaveValue("a\nb");
    await clearEvents(root);

    await page.keyboard.press("ControlOrMeta+Enter");

    await expect(eventItems(root)).toHaveText([
      "onBeforeCommit typing enter",
      "onCommit typing enter",
    ]);
    await expect(nameField(root)).toHaveValue("a\nb");
  });

  test("under `StrictMode`, each event fires once", async ({ mount, page }) => {
    const root = await mount(<FieldInputHarness strict />);

    await nameField(root).click();
    await page.keyboard.type("a");

    await expect(eventItems(root)).toHaveText([
      "onFocus",
      "onBeforeInput typing",
      "onInput typing",
      "onBeforeChange typing",
      "onChange typing",
      "onValidate typing",
    ]);
  });

  test("removing the field releases every listener", async ({
    mount,
    page,
  }) => {
    const resetListeners = await trackResetListeners(page);
    const root = await mount(<FieldInputHarness />);
    const control = await nameField(root).elementHandle();
    expect(await resetListeners()).toBe(1);

    await root.getByRole("button", { name: "Remove the field" }).click();
    await expect(nameField(root)).toHaveCount(0);
    expect(await resetListeners()).toBe(0);

    await control.evaluate((element) => {
      element.dispatchEvent(new FocusEvent("focus"));
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(eventItems(root)).toHaveCount(0);
  });
});
