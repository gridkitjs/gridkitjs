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

  it("shifts the overlay down along a side by the offset", () => {
    expect(
      placeOverlay(button(50, 40), panel, viewport, {
        placement: "right-start",
        offset: -8,
      }),
    ).toEqual({ top: 32, left: 150, placement: "right-start" });
  });

  it("shifts the overlay right along the top or bottom by the offset", () => {
    expect(
      placeOverlay(button(50, 40), panel, viewport, { offset: 10 }),
    ).toEqual({ top: 60, left: 60, placement: "bottom-start" });
    expect(
      placeOverlay(button(300, 40), panel, viewport, {
        placement: "bottom-end",
        offset: 10,
      }),
    ).toEqual({ top: 60, left: 210, placement: "bottom-end" });
  });

  it("keeps the offset when a side placement flips to the other side", () => {
    expect(
      placeOverlay(button(650, 40), panel, viewport, {
        placement: "right-start",
        offset: -8,
      }),
    ).toEqual({ top: 32, left: 450, placement: "left-start" });
  });

  it("chooses the edge for the shifted overlay", () => {
    // Lined up with the anchor's left edge it would just fit; shifted 20px
    // right it would not, so it lines up with the right edge instead.
    expect(
      placeOverlay(button(600, 40), panel, viewport, { offset: 20 }),
    ).toEqual({ top: 60, left: 520, placement: "bottom-end" });
  });

  it("still keeps an offset overlay on screen", () => {
    expect(
      placeOverlay(button(50, 4), panel, viewport, {
        placement: "right-start",
        offset: -8,
      }),
    ).toEqual({ top: 0, left: 150, placement: "right-start" });
  });

  it("pins an overlay bigger than the viewport to its top-left corner", () => {
    const huge = { width: 1000, height: 700 };
    expect(placeOverlay(button(50, 40), huge, viewport)).toMatchObject({
      top: 0,
      left: 0,
    });
  });
});

describe("placeOverlay in right-to-left", () => {
  const rtl = { direction: "rtl" } as const;

  it("lines a start placement up with the anchor's right edge", () => {
    expect(placeOverlay(button(500, 40), panel, viewport, rtl)).toEqual({
      top: 60,
      left: 400,
      placement: "bottom-start",
    });
  });

  it("lines an end placement up with the anchor's left edge", () => {
    expect(
      placeOverlay(button(300, 40), panel, viewport, {
        ...rtl,
        placement: "bottom-end",
      }),
    ).toEqual({ top: 60, left: 300, placement: "bottom-end" });
  });

  it("places as in left-to-right when told ltr", () => {
    expect(
      placeOverlay(button(500, 40), panel, viewport, { direction: "ltr" }),
    ).toEqual({ top: 60, left: 500, placement: "bottom-start" });
  });

  it("lines up with the other edge when the start one runs off the left", () => {
    expect(placeOverlay(button(50, 40), panel, viewport, rtl)).toEqual({
      top: 60,
      left: 50,
      placement: "bottom-end",
    });
  });

  it("flips above the anchor as in left-to-right", () => {
    expect(
      placeOverlay(button(500, 560), panel, viewport, { ...rtl, gap: 4 }),
    ).toEqual({ top: 456, left: 400, placement: "top-start" });
  });

  it("opens a right placement, a submenu's, to the anchor's left", () => {
    expect(
      placeOverlay(button(500, 40), panel, viewport, {
        ...rtl,
        placement: "right-start",
      }),
    ).toEqual({ top: 40, left: 300, placement: "right-start" });
  });

  it("flips a right placement to the anchor's right when there is no room to its left", () => {
    expect(
      placeOverlay(button(100, 40), panel, viewport, {
        ...rtl,
        placement: "right-start",
      }),
    ).toEqual({ top: 40, left: 200, placement: "left-start" });
  });

  it("runs an offset along the top or bottom leftward", () => {
    expect(
      placeOverlay(button(500, 40), panel, viewport, { ...rtl, offset: 10 }),
    ).toEqual({ top: 60, left: 390, placement: "bottom-start" });
  });

  it("keeps the right edge of an overlay wider than the viewport in view", () => {
    expect(
      placeOverlay(button(500, 40), { width: 900, height: 100 }, viewport, rtl),
    ).toEqual({ top: 60, left: -100, placement: "bottom-start" });
  });

  it("opens beside a point toward the left", () => {
    expect(
      placeOverlay(
        { top: 100, left: 500, width: 0, height: 0 },
        panel,
        viewport,
        rtl,
      ),
    ).toEqual({ top: 100, left: 300, placement: "bottom-start" });
  });
});
