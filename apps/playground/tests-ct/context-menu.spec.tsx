// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import { expect, test } from "./support/coverage";
import ContextMenuTriggerHarness from "./support/ContextMenuTriggerHarness";

test.describe("trigger", () => {
  test("a right-click inside the root asks once, at the pointer, and prevents the browser's menu", async ({
    mount,
  }) => {
    const root = await mount(<ContextMenuTriggerHarness />);

    await root.getByRole("button", { name: "Cell" }).click({ button: "right" });

    await expect(root.getByTestId("requests")).toHaveText(
      "pointer on cell at a point",
    );
    await expect(root.getByTestId("prevented")).toContainText(
      "contextmenu true",
    );
  });

  for (const key of ["Shift+F10", "ContextMenu"]) {
    test(`${key} asks once from the keyboard, with no point`, async ({
      mount,
    }) => {
      const root = await mount(<ContextMenuTriggerHarness />);
      const cell = root.getByRole("button", { name: "Cell" });

      await cell.focus();
      await cell.press(key);

      await expect(root.getByTestId("requests")).toHaveText(
        "keyboard on cell no point",
      );
      await expect(root.getByTestId("prevented")).toContainText(
        `${key.replace("Shift+", "")} true`,
      );
    });
  }

  test("the contextmenu event a key press brings is taken, not asked for again", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ContextMenuTriggerHarness />);
    const cell = root.getByRole("button", { name: "Cell" });

    await cell.focus();
    await cell.press("Shift+F10");
    // What a browser that turns the key into a `contextmenu` of its own fires.
    await page.evaluate(() => {
      document
        .getElementById("cell")
        ?.dispatchEvent(
          new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
        );
    });

    await expect(root.getByTestId("requests")).toHaveText(
      "keyboard on cell no point",
    );
    await expect(root.getByTestId("prevented")).toContainText(
      "contextmenu true",
    );

    await cell.click({ button: "right" });
    await expect(root.getByTestId("requests")).toHaveText(
      "keyboard on cell no point; pointer on cell at a point",
    );
  });

  test("an event a template prevented is left to it", async ({ mount }) => {
    const root = await mount(<ContextMenuTriggerHarness />);

    await root.getByText("Template").click({ button: "right" });

    await expect(root.getByTestId("template-menus")).toHaveText("1");
    await expect(root.getByTestId("requests")).toHaveText("");
  });

  test("nothing outside the root is asked for", async ({ mount }) => {
    const root = await mount(<ContextMenuTriggerHarness />);

    await root
      .getByRole("button", { name: "Outside" })
      .click({ button: "right" });

    await expect(root.getByTestId("prevented")).toHaveText("contextmenu false");
    await expect(root.getByTestId("requests")).toHaveText("");
  });

  test("a request that opens no menu leaves the browser's own", async ({
    mount,
  }) => {
    const root = await mount(<ContextMenuTriggerHarness opens={false} />);

    await root.getByRole("button", { name: "Cell" }).click({ button: "right" });

    await expect(root.getByTestId("requests")).toHaveText(
      "pointer on cell at a point",
    );
    await expect(root.getByTestId("prevented")).toHaveText("contextmenu false");
  });
});
