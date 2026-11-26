import type { Locator } from "@playwright/test";
import { expect } from "../coverage";

export interface FloatingLabelPlace {
  /** The bottom of the label's box. */
  readonly labelBottom: number;
  /** The top of the control's border box. */
  readonly controlTop: number;
  /** Where the label's text starts: its box less its inline padding. */
  readonly textStart: number;
  /** The inline start of the control's border box. */
  readonly controlStart: number;
  readonly fieldHeight: number;
}

/**
 * Where the floating label of `field` (a `.gridkit-forms-field`) sits
 * against its control, once it has stopped moving. The control is the
 * input's box, or a bare input where there is none.
 */
export async function floatingLabelPlace(
  field: Locator,
): Promise<FloatingLabelPlace> {
  const label = field.locator(".gridkit-forms-field-label");
  await expect
    .poll(() => label.evaluate((element) => element.getAnimations().length))
    .toBe(0);
  return field.evaluate((element) => {
    const labelElement = element.querySelector(".gridkit-forms-field-label");
    const control =
      element.querySelector(".gridkit-forms-control") ??
      element.querySelector("input:not([type=hidden])");
    if (labelElement === null || control === null) {
      throw new Error("The field has no label or no control");
    }
    const box = labelElement.getBoundingClientRect();
    const padding = parseFloat(
      getComputedStyle(labelElement).paddingInlineStart,
    );
    const controlBox = control.getBoundingClientRect();
    const rtl = getComputedStyle(element).direction === "rtl";
    return {
      labelBottom: box.bottom,
      controlTop: controlBox.top,
      textStart: rtl ? box.right - padding : box.left + padding,
      controlStart: rtl ? controlBox.right : controlBox.left,
      fieldHeight: element.getBoundingClientRect().height,
    };
  });
}
