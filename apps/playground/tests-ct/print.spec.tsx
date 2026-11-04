// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import PrintHarness from "./support/PrintHarness";
import type { RecordedPrint } from "./support/printRecorder";

/** Every print the harness saw open, in order. */
async function printsOf(root: MountResult): Promise<RecordedPrint[]> {
  const text = await root.getByTestId("prints").textContent();
  return JSON.parse(text ?? "[]") as RecordedPrint[];
}

/** The print frame, which `printDocument` puts straight into `document.body`. */
function printFrames(page: Page) {
  return page.locator("body > iframe");
}

test.describe("printDocument", () => {
  test("prints the document in a hidden frame, then removes it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<PrintHarness />);
    await root.getByRole("button", { name: "Print", exact: true }).click();

    await expect(root.getByTestId("settled")).toHaveText("first");
    const prints = await printsOf(root);
    expect(prints).toHaveLength(1);
    const [print] = prints;
    expect(print?.frame).toEqual({ ariaHidden: "true", width: 0, height: 0 });
    await expect(printFrames(page)).toHaveCount(0);
  });

  test("gives the frame the title, the stylesheet and every row", async ({
    mount,
  }) => {
    const root = await mount(<PrintHarness />);
    await root.getByRole("button", { name: "Print", exact: true }).click();
    await expect(root.getByTestId("settled")).toHaveText("first");

    const [print] = await printsOf(root);
    expect(print?.title).toBe("Orders <Q1>");
    expect(print?.styles).toContain("@page { size: A4 portrait; margin: 12mm;");
    expect(print?.styles).toContain(
      ".gridkit-export-table thead { display: table-header-group; }",
    );
    expect(print?.styles).toContain(".app-extra { color: red; }");
    expect(print?.bodyHtml).toContain(
      '<h1 class="print-title">Orders &lt;Q1&gt;</h1>',
    );
    expect(print?.bodyHtml.match(/<tr>/g)).toHaveLength(3);
    expect(print?.bodyHtml).toContain("<td>&lt;Bravo&gt;</td>");
  });

  test("refuses a second print while one is open", async ({ mount }) => {
    const root = await mount(<PrintHarness />);
    await root.getByRole("button", { name: "Print twice" }).click();

    // The second settles at once, without printing; the first once printed.
    await expect(root.getByTestId("settled")).toHaveText("second,first");
    expect(await printsOf(root)).toHaveLength(1);
  });

  test("prints again once the last print is over", async ({ mount }) => {
    const root = await mount(<PrintHarness />);
    const print = root.getByRole("button", { name: "Print", exact: true });
    await print.click();
    await expect(root.getByTestId("settled")).toHaveText("first");
    await print.click();

    await expect(root.getByTestId("settled")).toHaveText("first,first");
    expect(await printsOf(root)).toHaveLength(2);
  });

  test("gives focus back where it was", async ({ mount }) => {
    const root = await mount(<PrintHarness />);
    const print = root.getByRole("button", { name: "Print", exact: true });
    await print.focus();
    await print.press("Enter");

    await expect(root.getByTestId("settled")).toHaveText("first");
    await expect(print).toBeFocused();
  });
});
