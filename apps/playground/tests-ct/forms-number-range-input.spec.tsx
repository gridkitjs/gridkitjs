// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Locator } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";
import NumberRangeInputHarness from "./support/forms/NumberRangeInputHarness";
import { typeInto } from "./support/forms/typeInto";

function start(root: MountResult): Locator {
  return root.getByRole("spinbutton", { name: "Price From" });
}

function end(root: MountResult): Locator {
  return root.getByRole("spinbutton", { name: "Price To" });
}

/** Empties the event log, for the action under test. */
async function clearEvents(root: MountResult): Promise<void> {
  await root.getByRole("button", { name: "Clear events" }).click();
  await expect(eventItems(root)).toHaveCount(0);
}

/** The logged events of one handler, oldest first. */
async function eventsOf(root: MountResult, name: string) {
  return (await loggedEvents(root)).filter((event) => event.name === name);
}

test.describe("NumberRangeInput: entry", () => {
  test("types both ends; each change names its end; one commit on leaving", async ({
    mount,
    page,
  }) => {
    const root = await mount(<NumberRangeInputHarness locale="en-US" />);

    await typeInto(start(root), "10");
    await page.keyboard.press("Tab");
    await expect(end(root)).toBeFocused();
    await page.keyboard.type("25");

    const changes = await eventsOf(root, "onChange");
    expect(changes.at(0)).toMatchObject({
      value: { start: 1, end: null },
      changedEnd: "start",
    });
    expect(changes.at(-1)).toMatchObject({
      value: { start: 10, end: 25 },
      changedEnd: "end",
      span: 15,
      text: "10–25",
    });
    expect(await eventsOf(root, "onCommit")).toHaveLength(0);
    expect(await eventsOf(root, "onFocus")).toHaveLength(1);

    await page.keyboard.press("Tab");

    await expect(root.getByRole("textbox", { name: "Next" })).toBeFocused();
    const commits = await eventsOf(root, "onCommit");
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      value: { start: 10, end: 25 },
      trigger: "tab",
      changed: true,
      changedEnd: "both",
    });
    expect((await loggedEvents(root)).at(-1)?.name).toBe("onBlur");
  });

  test("leaves an end open", async ({ mount, page }) => {
    const root = await mount(<NumberRangeInputHarness locale="en-US" />);

    await typeInto(end(root), "50");
    await page.keyboard.press("Enter");

    expect((await eventsOf(root, "onCommit")).at(-1)).toMatchObject({
      value: { start: null, end: 50 },
      trigger: "enter",
      changedEnd: "end",
    });
  });

  test("swaps a reversed range, and the texts change places on leaving", async ({
    mount,
    page,
  }) => {
    const root = await mount(<NumberRangeInputHarness locale="en-US" />);

    await typeInto(start(root), "20");
    await page.keyboard.press("Tab");
    await page.keyboard.type("5");

    expect((await eventsOf(root, "onChange")).at(-1)).toMatchObject({
      value: { start: 5, end: 20 },
    });
    await expect(start(root)).toHaveValue("20");
    await expect(end(root)).toHaveValue("5");

    await root.getByRole("textbox", { name: "Next" }).click();

    await expect(start(root)).toHaveValue("5");
    await expect(end(root)).toHaveValue("20");
    expect((await eventsOf(root, "onCommit")).at(-1)).toMatchObject({
      value: { start: 5, end: 20 },
      trigger: "blur",
    });
  });

  test('refuses a reversed range with reversed="error", marking both ends', async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="en-US" reversed="error" />,
    );

    await typeInto(start(root), "20");
    await page.keyboard.press("Tab");
    await page.keyboard.type("5");
    await page.keyboard.press("Enter");

    await expect(
      root.getByText("The end comes before the start"),
    ).toBeVisible();
    await expect(start(root)).toHaveAttribute("aria-invalid", "true");
    await expect(end(root)).toHaveAttribute("aria-invalid", "true");
    expect(await eventsOf(root, "onCommit")).toHaveLength(0);
  });

  test("onBeforeChange rewrites the end, and onChange and the end show the rewrite", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="en-US" exclusiveEnd />,
    );

    await typeInto(start(root), "1");
    await page.keyboard.press("Tab");
    await page.keyboard.type("9");

    expect((await eventsOf(root, "onChange")).at(-1)).toMatchObject({
      value: { start: 1, end: 10 },
    });
    await expect(end(root)).toHaveValue("10");
  });

  test("Escape puts back the last committed range", async ({ mount, page }) => {
    const root = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        defaultValue={{ start: 1, end: 9 }}
      />,
    );
    await start(root).click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("4");
    await page.keyboard.press("Tab");
    await page.keyboard.type("7");

    await page.keyboard.press("Escape");

    await expect(start(root)).toHaveValue("1");
    await expect(end(root)).toHaveValue("9");
    expect((await eventsOf(root, "onChange")).at(-1)).toMatchObject({
      value: { start: 1, end: 9 },
      source: "revert",
    });
  });

  test("an arrow key steps an end, and stops at the other end", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        defaultValue={{ start: 3, end: 5 }}
      />,
    );
    await start(root).click();

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");

    await expect(start(root)).toHaveValue("5");
    expect((await eventsOf(root, "onChange")).at(-1)).toMatchObject({
      value: { start: 5, end: 5 },
      source: "step",
      changedEnd: "start",
    });
  });

  test("fixed decimals on both ends, in de-DE", async ({ mount, page }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="de-DE" fractionDigits={2} />,
    );

    await typeInto(start(root), "1234");
    await page.keyboard.press("Tab");
    await page.keyboard.type("2000,5");
    await page.keyboard.press("Tab");

    await expect(start(root)).toHaveValue("1.234,00");
    await expect(end(root)).toHaveValue("2.000,50");
  });

  test("submits each end under name.start and name.end", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="en-US" name="price" />,
    );
    await typeInto(start(root), "2.5");
    await page.keyboard.press("Tab");

    await root.getByRole("button", { name: "Submit" }).click();

    await expect(root.getByTestId("submitted")).toHaveText(
      JSON.stringify([
        ["price.start", "2.5"],
        ["price.end", ""],
      ]),
    );
  });

  test("the clear button empties both ends and commits", async ({ mount }) => {
    const root = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        clearable
        defaultValue={{ start: 1, end: 2 }}
      />,
    );
    await start(root).click();
    await clearEvents(root);

    await root.getByRole("button", { name: "Clear", exact: true }).click();

    await expect(start(root)).toHaveValue("");
    await expect(end(root)).toHaveValue("");
    expect((await eventsOf(root, "onCommit")).at(-1)).toMatchObject({
      value: null,
      trigger: "clear",
    });
  });
});

test.describe("NumberRangeInput: messages", () => {
  test("an end that cannot be read marks only that end", async ({
    mount,
    page,
  }) => {
    const root = await mount(<NumberRangeInputHarness locale="en-US" />);

    await typeInto(start(root), "1,5");
    await page.keyboard.press("Tab");
    await page.keyboard.type("9");
    await page.keyboard.press("Enter");

    await expect(start(root)).toHaveAttribute("aria-invalid", "true");
    await expect(end(root)).not.toHaveAttribute("aria-invalid", "true");
  });

  test("min and max bound both ends; the end out of bounds is marked", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="en-US" min={0} max={100} />,
    );

    await typeInto(start(root), "10");
    await page.keyboard.press("Tab");
    await page.keyboard.type("150");
    await page.keyboard.press("Enter");

    await expect(root.getByText("Enter 100 or less")).toBeVisible();
    await expect(end(root)).toHaveAttribute("aria-invalid", "true");
    await expect(start(root)).not.toHaveAttribute("aria-invalid", "true");
  });

  test("shows the span after the end, and refuses one shorter than minSpan", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="en-US" showSpan minSpan={5} />,
    );

    await typeInto(start(root), "10");
    await page.keyboard.press("Tab");
    await page.keyboard.type("12");

    await expect(root.getByText("Span: 2")).toBeVisible();
    await expect(end(root)).toHaveAccessibleDescription(/Span: 2/);

    await page.keyboard.press("Enter");
    await expect(
      root.getByText("The range must span at least 5"),
    ).toBeVisible();
  });

  test("a half-open range from a value to itself is empty", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="en-US" bounds="[)" />,
    );

    await typeInto(start(root), "10");
    await page.keyboard.press("Tab");
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");

    await expect(root.getByText("The range is empty")).toBeVisible();
  });

  test("an app warning shows its severity on the box", async ({ mount }) => {
    const root = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        message={{ text: "Prices are rounded", severity: "warning" }}
      />,
    );

    await expect(root.getByText("Prices are rounded")).toBeVisible();
    await expect(root.locator(".gridkit-forms-range-control")).toHaveClass(
      /is-warning/,
    );
  });
});

test.describe("NumberRangeInput: states", () => {
  test("display mode writes both ends, one open end, or the empty dash", async ({
    mount,
  }) => {
    const both = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        mode="display"
        defaultValue={{ start: 10, end: 20 }}
      />,
    );
    await expect(both.locator(".gridkit-forms-display-value")).toHaveText(
      "10–20",
    );
    await both.unmount();

    const from = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        mode="display"
        defaultValue={{ start: 10, end: null }}
      />,
    );
    await expect(from.locator(".gridkit-forms-display-value")).toHaveText(
      "from 10",
    );
    await from.unmount();

    const upTo = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        mode="display"
        defaultValue={{ start: null, end: 20 }}
      />,
    );
    await expect(upTo.locator(".gridkit-forms-display-value")).toHaveText(
      "up to 20",
    );
    await upTo.unmount();

    const empty = await mount(
      <NumberRangeInputHarness locale="en-US" mode="display" />,
    );
    await expect(empty.locator(".gridkit-forms-display-value")).toContainText(
      "No value",
    );
  });

  test("a currency range in display mode is written as one range", async ({
    mount,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness
        locale="de-DE"
        currency="EUR"
        mode="display"
        defaultValue={{ start: 10, end: 20 }}
      />,
    );
    await expect(root.locator(".gridkit-forms-display-value")).toHaveText(
      "10,00–20,00\u00A0€",
    );
  });

  test("read-only ends take no typing and no steps", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        readOnly
        defaultValue={{ start: 1, end: 2 }}
      />,
    );
    await start(root).click();
    await page.keyboard.type("5");
    await page.keyboard.press("ArrowUp");

    await expect(start(root)).toHaveValue("1");
    expect(await eventsOf(root, "onChange")).toHaveLength(0);
  });

  test("disabled ends cannot be focused, and submit nothing", async ({
    mount,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness
        locale="en-US"
        disabled
        name="price"
        defaultValue={{ start: 1, end: 2 }}
      />,
    );

    await expect(start(root)).toBeDisabled();
    await expect(end(root)).toBeDisabled();
    await root.getByRole("button", { name: "Submit" }).click();
    await expect(root.getByTestId("submitted")).toHaveText("[]");
  });

  test("is a group named by the field's label, its ends in order in right to left", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <NumberRangeInputHarness locale="en-US" dir="rtl" />,
    );

    await expect(root.getByRole("group", { name: "Price" })).toBeVisible();
    const startBox = await start(root).boundingBox();
    const endBox = await end(root).boundingBox();
    expect(startBox?.x ?? 0).toBeGreaterThan(endBox?.x ?? 0);

    await start(root).click();
    await page.keyboard.press("Tab");
    await expect(end(root)).toBeFocused();
  });

  test("keeps both ends on one line in a narrow column, as at 200% zoom", async ({
    mount,
  }) => {
    const root = await mount(
      <div style={{ inlineSize: "180px" }}>
        <NumberRangeInputHarness
          locale="en-US"
          showSpan
          defaultValue={{ start: 1000, end: 2500 }}
        />
      </div>,
    );

    const startBox = await start(root).boundingBox();
    const endBox = await end(root).boundingBox();
    expect(Math.round(startBox?.y ?? 0)).toBe(Math.round(endBox?.y ?? -1));
    expect(startBox?.width ?? 0).toBeGreaterThan(10);
    expect(endBox?.width ?? 0).toBeGreaterThan(10);
  });

  test("clicking the label focuses the start", async ({ mount }) => {
    const root = await mount(<NumberRangeInputHarness locale="en-US" bare />);

    await root.getByText("Price", { exact: true }).click();

    await expect(start(root)).toBeFocused();
  });
});
