import { describe, expect, it } from "vitest";
import { placeOverlay } from "./placeOverlay";

const viewport = { width: 800, height: 600 };
const panel = { width: 200, height: 100 };

/** A 100×20 button with its top-left corner at `(left, top)`. */
function button(left: number, top: number) {
  return { top, left, width: 100, height: 20 };
}

describe("placeOverlay", () => {
  it("opens below the anchor, lined up with its left edge, by default", () => {
    expect(placeOverlay(button(50, 40), panel, viewport)).toEqual({
      top: 60,
      left: 50,
      placement: "bottom-start",
    });
  });

  it("leaves the gap between the anchor and the overlay", () => {
    expect(placeOverlay(button(50, 40), panel, viewport, { gap: 4 })).toEqual({
      top: 64,
      left: 50,
      placement: "bottom-start",
    });
  });

  it("lines the overlay up with the anchor's right edge for an end placement", () => {
    expect(
      placeOverlay(button(300, 40), panel, viewport, {
        placement: "bottom-end",
      }),
    ).toEqual({ top: 60, left: 200, placement: "bottom-end" });
  });

  it("flips above the anchor when there is no room below but room above", () => {
    expect(placeOverlay(button(50, 560), panel, viewport, { gap: 4 })).toEqual({
      top: 456,
      left: 50,
      placement: "top-start",
    });
  });

  it("flips below a top placement when there is no room above", () => {
    expect(
      placeOverlay(button(50, 40), panel, viewport, { placement: "top-start" }),
    ).toEqual({ top: 60, left: 50, placement: "bottom-start" });
  });

  it("lines up with the other edge when the preferred one runs off screen", () => {
    expect(placeOverlay(button(650, 40), panel, viewport)).toEqual({
      top: 60,
      left: 550,
      placement: "bottom-end",
    });
    expect(
      placeOverlay(button(20, 40), panel, viewport, {
        placement: "bottom-end",
      }),
    ).toEqual({ top: 60, left: 20, placement: "bottom-start" });
  });

  it("flips a side placement to the other side at the viewport's edge", () => {
    expect(
      placeOverlay(button(650, 40), panel, viewport, {
        placement: "right-start",
      }),
    ).toEqual({ top: 40, left: 450, placement: "left-start" });
  });

  it("opens beside a point as beside an anchor with no size", () => {
    const point = { top: 300, left: 700, width: 0, height: 0 };
    expect(placeOverlay(point, panel, viewport)).toEqual({
      top: 300,
      left: 500,
      placement: "bottom-end",
    });
  });

  it("takes the roomier side and stays on screen when neither side fits", () => {
    const tall = { width: 200, height: 500 };
    expect(placeOverlay(button(50, 200), tall, viewport)).toEqual({
      top: 100,
      left: 50,
      placement: "bottom-start",
    });
    expect(placeOverlay(button(50, 380), tall, viewport)).toEqual({
      top: 0,
      left: 50,
      placement: "top-start",
    });
  });

  it("pins an overlay bigger than the viewport to its top-left corner", () => {
    const huge = { width: 1000, height: 700 };
    expect(placeOverlay(button(50, 40), huge, viewport)).toMatchObject({
      top: 0,
      left: 0,
    });
  });
});
