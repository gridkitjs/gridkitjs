import { FormsPlayground } from "../src/forms/FormsPlayground";
import { expect, test } from "./support/coverage";

test.describe("forms playground page", () => {
  test("logs the field input's events in order, until cleared", async ({
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
      "onChangeField input",
      '"ab"',
      '"a"',
      '"ab"',
      "typing",
      "",
      "input",
    ]);

    await root.getByRole("button", { name: "Clear" }).click();
    await expect(rows).toHaveCount(0);
  });

  test("the toggles add a validator and a slow check", async ({ mount }) => {
    const root = await mount(<FormsPlayground />);
    const name = root.getByRole("textbox", { name: "Name" });
    const messages = root.getByRole("list", { name: "Name messages" });
    await root.getByLabel("Required").check();
    await root.getByLabel(/^Slow check/).check();

    // Validators run on a change, so the empty value is checked once
    // something is typed and deleted.
    await name.click();
    await name.press("a");
    await name.press("Backspace");
    await name.press("Enter");
    await expect(messages).toHaveText("Checking…");
    await expect(messages).toHaveText("Enter a value");

    await name.pressSequentially("taken");
    await name.press("Enter");
    await expect(messages).toHaveText('"taken" is taken');
    await expect(name).toHaveAttribute("aria-invalid", "true");
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

    await root.getByLabel("Density").selectOption("comfortable");
    // The component-test build generates no Tailwind utilities, so the
    // class stands in for the height it sets on the page.
    await expect(input).toHaveClass(/\bh-10\b/);

    await root.getByLabel("Disabled").check();
    await expect(input).toBeDisabled();
    await root.getByLabel("Disabled").uncheck();

    await root.getByLabel("Read only").check();
    await expect(input).toHaveAttribute("readonly");

    await root.getByLabel("Mode").selectOption("display");
    await expect(root.getByRole("textbox")).toHaveCount(0);

    // The URL holds every choice, so a combination can be linked to.
    expect(
      Object.fromEntries(new URL(page.url()).searchParams.entries()),
    ).toEqual({
      preset: "midnight",
      scheme: "dark",
      dir: "rtl",
      locale: "de-DE",
      density: "comfortable",
      readonly: "",
      mode: "display",
    });
  });
});
