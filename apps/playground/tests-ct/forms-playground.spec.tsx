import { FormsPlayground } from "../src/forms/FormsPlayground";
import presetIndex from "@gridkitjs/theme-tailwind/presets/index.json" with { type: "json" };
import { expect, test } from "./support/coverage";
import { typeInto } from "./support/forms/typeInto";

test.describe("forms playground page", () => {
  test("logs the text input's events in order, until cleared", async ({
    mount,
  }) => {
    const root = await mount(<FormsPlayground />);
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");
    const name = root.getByRole("textbox", { name: "Name" });

    await name.click();
    await name.pressSequentially("ab");

    // Focus, then for each key: onBeforeInput, onInput, onBeforeChange,
    // onChange and onValidate.
    await expect(rows).toHaveCount(11);
    await expect(rows.nth(0)).toContainText("onFocus");
    await expect(rows.nth(9).locator("td")).toHaveText([
      "10",
      "onChangeTextInput",
      '"ab"',
      '"a"',
      '"ab"',
      "typing",
      "",
      "input",
    ]);

    await root
      .getByRole("complementary")
      .getByRole("button", { name: "Clear" })
      .click();
    await expect(rows).toHaveCount(0);
  });

  test("the toggles add a validator and a slow check", async ({ mount }) => {
    const root = await mount(<FormsPlayground />);
    const name = root.getByRole("textbox", { name: "Name" });
    const status = root.getByRole("status").filter({ hasText: "Checking" });
    await root.getByLabel("Required", { exact: true }).check();
    await root.getByLabel(/^Slow check/).check();

    // Validators run on a change, so the empty value is checked once
    // something is typed and deleted.
    await name.click();
    await name.press("a");
    await name.press("Backspace");
    await name.press("Enter");
    await expect(status).toHaveText("Checking…");
    await expect(name).toHaveAccessibleDescription("Error: Enter a value");

    await name.pressSequentially("taken");
    await name.press("Enter");
    await expect(name).toHaveAccessibleDescription('Error: "taken" is taken');
    await expect(name).toHaveAttribute("aria-invalid", "true");
  });

  test("the Required toggle stars the field, until the page marks no fields", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FormsPlayground />);
    const nameField = root
      .locator(".gridkit-forms-field")
      .filter({ has: page.getByRole("textbox", { name: "Name" }) });
    const star = nameField.locator(".gridkit-forms-field-required");
    await expect(star).toHaveCount(0);

    await root.getByLabel("Required", { exact: true }).check();
    await expect(star).toBeVisible();
    await expect(root.getByRole("textbox", { name: "Name" })).toHaveAttribute(
      "aria-required",
      "true",
    );

    await root.getByLabel("Marked fields").selectOption("none");
    await expect(star).toHaveCount(0);
  });

  test("applies each page control", async ({ mount, page }) => {
    const root = await mount(<FormsPlayground />);
    const html = page.locator("html");
    const input = root.getByRole("textbox", { name: "Name" });

    await root.getByLabel("Preset").selectOption("midnight");
    await expect(
      page.locator('style[data-gridkit-preset="midnight"]'),
    ).toHaveCount(1);

    await root.getByLabel("Colour scheme").selectOption("dark");
    await expect(html).toHaveClass(/\bgridkit-dark\b/);

    await root.getByLabel("Right to left").check();
    await expect(html).toHaveAttribute("dir", "rtl");

    await root.getByLabel("Locale").selectOption("de-DE");
    await expect(html).toHaveAttribute("lang", "de-DE");

    await root
      .getByLabel("Page controls")
      .getByLabel("Floating label")
      .selectOption("above");
    await expect(html).toHaveClass(/\bgridkit-forms-floating-above\b/);

    await root.getByLabel("Density").selectOption("comfortable");
    await expect(
      root
        .locator(".gridkit-forms-control")
        .filter({ has: page.getByRole("textbox", { name: "Name" }) }),
    ).toHaveClass(/\bis-comfortable\b/);

    await root.getByRole("checkbox", { name: "Disabled" }).check();
    await expect(input).toBeDisabled();
    await root.getByRole("checkbox", { name: "Disabled" }).uncheck();

    await root.getByLabel("Read only").check();
    await expect(input).toHaveAttribute("readonly");

    await root
      .getByLabel("Page controls")
      .getByLabel("Mode")
      .selectOption("display");
    await expect(root.getByRole("textbox")).toHaveCount(0);

    // The URL holds every choice, so a combination can be linked to.
    expect(
      Object.fromEntries(new URL(page.url()).searchParams.entries()),
    ).toEqual({
      preset: "midnight",
      scheme: "dark",
      dir: "rtl",
      locale: "de-DE",
      floating: "above",
      density: "comfortable",
      readonly: "",
      mode: "display",
    });
  });

  test("the field section reports its inputs and follows the page controls", async ({
    mount,
  }) => {
    const root = await mount(<FormsPlayground />);
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");
    const topLabel = root.getByRole("textbox", { name: "Top label" });

    await topLabel.click();
    await topLabel.press("a");
    await topLabel.press("Tab");
    await expect(rows.filter({ hasText: "onCommit" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "onCommit" })).toContainText(
      "Field: Top label",
    );

    await root.getByRole("checkbox", { name: "Disabled" }).check();
    await expect(topLabel).toBeDisabled();
    await root.getByRole("checkbox", { name: "Disabled" }).uncheck();

    await root
      .getByLabel("Page controls")
      .getByLabel("Mode")
      .selectOption("display");
    await expect(root.getByRole("group", { name: "Top label" })).toHaveText(
      /Top label\s*a/,
    );
  });

  test("the text input section logs a clear from the box's clear button", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FormsPlayground />);
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");
    const clearable = root.getByRole("textbox", { name: "Clearable" });

    await root
      .locator(".gridkit-forms-control")
      .filter({ has: page.getByRole("textbox", { name: "Clearable" }) })
      .getByRole("button", { name: "Clear" })
      .click();

    await expect(clearable).toHaveValue("");
    await expect(rows.first()).toContainText("onClearTextInput: Clearable");
    await expect(rows.filter({ hasText: "onCommit" })).toContainText("clear");
  });

  test("the checkbox section logs a flip and keeps the select-all mixed", async ({
    mount,
  }) => {
    const root = await mount(<FormsPlayground />);
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");
    const all = root.getByRole("checkbox", { name: /All columns/ });

    await expect(all).toBeChecked({ indeterminate: true });
    await root.getByRole("checkbox", { name: "City", exact: true }).click();
    await root.getByRole("checkbox", { name: "Score", exact: true }).click();

    await expect(all).toBeChecked();
    await expect(
      rows.filter({ hasText: "onCommitCheckbox: Score" }),
    ).toContainText("toggle");
  });

  test("the switch section logs a flip and follows the page's mode", async ({
    mount,
  }) => {
    const root = await mount(<FormsPlayground />);
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");

    await root.getByRole("switch", { name: /^Off Email alerts/ }).click();
    await expect(rows.filter({ hasText: "onChangeSwitch: Off" })).toContainText(
      "true",
    );

    await root
      .getByLabel("Page controls")
      .getByLabel("Mode")
      .selectOption("display");
    await expect(root.getByRole("switch")).toHaveCount(0);
  });

  test("the search input section reads the text once typing pauses", async ({
    mount,
  }) => {
    const root = await mount(<FormsPlayground />);
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");
    const search = root.getByRole("searchbox", { name: "Search orders" });

    await search.click();
    await search.pressSequentially("ab");

    await expect(rows.filter({ hasText: "onChange" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "onInput" })).toHaveCount(2);
    await expect(rows.filter({ hasText: "onChange" })).toContainText('"ab"');
  });

  test("the form structure section refuses an empty save, then logs a save and each section toggle", async ({
    mount,
  }) => {
    const root = await mount(<FormsPlayground />);
    const form = root.getByRole("form", { name: "Customer order" });
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");
    const summary = form.locator(".gridkit-forms-message-summary");

    // The credit limit warning, in a collapsed section, is listed from the start.
    await expect(summary).toContainText(
      "Credit limit: Above the usual credit limit",
    );
    await form.getByRole("button", { name: "Save" }).click();
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Contact: Enter a value");
    await expect(summary).toContainText("Reference: Enter a reference");
    await expect(rows.filter({ hasText: "onReveal" })).toHaveCount(1);

    await summary.getByRole("link", { name: /^Credit limit/ }).click();
    await expect(
      form.getByRole("textbox", { name: "Credit limit" }),
    ).toBeFocused();
    await expect(rows.filter({ hasText: "onExpandedChange" })).toHaveCount(1);

    await typeInto(form.getByRole("textbox", { name: "Contact" }), "Ada");
    await typeInto(
      form.getByRole("textbox", { name: "Email" }),
      "ada@example.com",
    );
    await form.getByRole("textbox", { name: "Reference" }).fill("PO-7");
    await typeInto(form.getByRole("textbox", { name: "Street" }), "Main 1");
    await typeInto(form.getByRole("textbox", { name: "Postal code" }), "1011");
    await typeInto(form.getByRole("textbox", { name: "City" }), "Amsterdam");
    await form.getByRole("button", { name: "Save" }).click();
    await expect(rows.filter({ hasText: "onSubmit" })).toHaveCount(1);
    await expect(rows.filter({ hasText: "onSubmit" })).toContainText(
      "Amsterdam",
    );
  });

  test("the number input section logs typing and a step, in the page's locale", async ({
    mount,
  }) => {
    const root = await mount(<FormsPlayground />);
    const rows = root
      .getByRole("table", { name: "Event log" })
      .locator("tbody tr");
    await root.getByLabel("Locale").selectOption("de-DE");
    const amount = root.getByRole("spinbutton", { name: "Amount" });

    await typeInto(amount, "12,5");
    await expect(amount).toHaveValue("12,50");
    await amount.press("ArrowUp");

    // 12.5 is off the grid of whole steps, so the step goes to 13.
    await expect(amount).toHaveValue("13,00");
    await expect(rows.filter({ hasText: "onStep" })).toHaveCount(1);
    await expect(
      rows.filter({ hasText: "onChange" }).filter({ hasText: "step" }),
    ).toContainText("13");
  });

  test("the page's locale and density reach every component", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FormsPlayground />);
    const title = root
      .locator(".gridkit-forms-field")
      .filter({ has: page.getByRole("textbox", { name: "Title" }) });

    await root.getByLabel("Locale").selectOption("ar-EG");
    await expect(title.locator(".gridkit-forms-text-input-counter")).toHaveText(
      "١٦/٢٠",
    );

    await root.getByLabel("Density").selectOption("comfortable");
    await expect(
      root.getByRole("form", { name: "Customer order" }),
    ).toHaveClass(/\bis-comfortable\b/);
    // Every field takes the page's density but the "Each density" states,
    // which fix their own: a compact and a standard one per input.
    await expect(
      root.locator(".gridkit-forms-field:not(.is-comfortable)"),
    ).toHaveCount(8);
  });

  test("shows no console error under any preset, scheme, direction, floating label or mode", async ({
    mount,
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    const root = await mount(<FormsPlayground />);
    const controls = root.getByLabel("Page controls");

    for (const preset of presetIndex.presets) {
      await controls.getByLabel("Preset").selectOption(preset.id);
      for (const scheme of ["light", "dark"]) {
        await controls.getByLabel("Colour scheme").selectOption(scheme);
        await expect(page.locator("html")).toContainClass(`gridkit-${scheme}`);
      }
    }
    await controls.getByLabel("Right to left").check();
    await controls.getByLabel("Floating label").selectOption("above");
    await controls.getByLabel("Mode").selectOption("display");
    await controls.getByLabel("Mode").selectOption("edit");
    await root
      .getByRole("form", { name: "Customer order" })
      .getByRole("button", { name: "Save" })
      .click();

    expect(errors).toEqual([]);
  });
});
