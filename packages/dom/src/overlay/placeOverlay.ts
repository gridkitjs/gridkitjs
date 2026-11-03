/** Which side of its anchor an overlay opens on. */
export type OverlaySide = "top" | "bottom" | "left" | "right";

/**
 * Which edge of the anchor the overlay lines up with along that side: its
 * left edge (`start`) or right edge (`end`) for `top`/`bottom`, its top or
 * bottom edge for `left`/`right`.
 */
export type OverlayAlign = "start" | "end";

export type OverlayPlacement = `${OverlaySide}-${OverlayAlign}`;

/** A box in viewport coordinates, as `getBoundingClientRect` reports one. */
export interface OverlayRect {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface OverlaySize {
  readonly width: number;
  readonly height: number;
}

export interface OverlayPlacementOptions {
  /** Where the overlay would rather open. Defaults to `"bottom-start"`. */
  readonly placement?: OverlayPlacement | undefined;
  /** Space between the anchor and the overlay, in pixels. Defaults to `0`. */
  readonly gap?: number | undefined;
  /**
   * Pixels to shift the overlay along the anchor's edge — down beside a
   * `left`/`right` side, right beside `top`/`bottom`; negative goes the other
   * way. A submenu opened `right-start` takes its own top padding, negated,
   * so its first item lines up with the item that opened it. The overlay is
   * still kept on screen. Defaults to `0`.
   */
  readonly offset?: number | undefined;
}

/** Where an overlay goes: its top-left corner, and the placement it ended up with. */
export interface OverlayPosition {
  readonly top: number;
  readonly left: number;
  readonly placement: OverlayPlacement;
}

const OPPOSITE_SIDE: Readonly<Record<OverlaySide, OverlaySide>> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function isVertical(side: OverlaySide): boolean {
  return side === "top" || side === "bottom";
}

/** How much room `side` of `anchor` leaves before the viewport's edge. */
function roomBeside(
  side: OverlaySide,
  anchor: OverlayRect,
  viewport: OverlaySize,
): number {
  switch (side) {
    case "top":
      return anchor.top;
    case "bottom":
      return viewport.height - (anchor.top + anchor.height);
    case "left":
      return anchor.left;
    case "right":
      return viewport.width - (anchor.left + anchor.width);
  }
}

/**
 * The preferred side if the overlay fits there, the opposite one if it fits
 * there instead, and otherwise whichever has more room — a menu too tall for
 * either still shows as much of itself as it can.
 */
function chooseSide(
  preferred: OverlaySide,
  needed: number,
  anchor: OverlayRect,
  viewport: OverlaySize,
): OverlaySide {
  const opposite = OPPOSITE_SIDE[preferred];
  const room = roomBeside(preferred, anchor, viewport);
  const oppositeRoom = roomBeside(opposite, anchor, viewport);
  if (room >= needed) {
    return preferred;
  }
  return oppositeRoom >= needed || oppositeRoom > room ? opposite : preferred;
}

/** The preferred edge unless only the other one keeps the overlay on screen. */
function chooseAlign(
  preferred: OverlayAlign,
  fitsAtStart: boolean,
  fitsAtEnd: boolean,
): OverlayAlign {
  if (preferred === "start") {
    return fitsAtStart || !fitsAtEnd ? "start" : "end";
  }
  return fitsAtEnd || !fitsAtStart ? "end" : "start";
}

/** The overlay's offset away from the anchor: its top for `top`/`bottom`, its left otherwise. */
function offsetBeside(
  side: OverlaySide,
  anchor: OverlayRect,
  panel: OverlaySize,
  gap: number,
): number {
  switch (side) {
    case "top":
      return anchor.top - gap - panel.height;
    case "bottom":
      return anchor.top + anchor.height + gap;
    case "left":
      return anchor.left - gap - panel.width;
    case "right":
      return anchor.left + anchor.width + gap;
  }
}

/** Keeps `value` within `[0, limit]`, pinning to `0` when even that fails. */
function clampIntoView(value: number, limit: number): number {
  return Math.max(0, Math.min(value, limit));
}

/**
 * Where an overlay of size `panel` goes beside `anchor` so that it stays in
 * `viewport`: on the preferred side unless only the opposite one has room,
 * lined up with the preferred edge unless that runs it off screen and the
 * other edge does not, and finally pushed back inside if it still overflows.
 * Pure, so the rules are testable without a browser; `attachOverlay` feeds it
 * the measurements.
 *
 * A point — a context menu opened where the pointer is — is an anchor with
 * no width or height, which is what makes `start`/`end` mean "after" and
 * "before" it.
 */
export function placeOverlay(
  anchor: OverlayRect,
  panel: OverlaySize,
  viewport: OverlaySize,
  options: OverlayPlacementOptions = {},
): OverlayPosition {
  const [preferredSide, preferredAlign] = (
    options.placement ?? "bottom-start"
  ).split("-") as [OverlaySide, OverlayAlign];
  const gap = options.gap ?? 0;
  const offset = options.offset ?? 0;
  const vertical = isVertical(preferredSide);

  const side = chooseSide(
    preferredSide,
    (vertical ? panel.height : panel.width) + gap,
    anchor,
    viewport,
  );

  // The axis the overlay runs along beside the anchor, shifted by the offset
  // before an edge is chosen, so the shifted overlay is what has to fit.
  const anchorStart = (vertical ? anchor.left : anchor.top) + offset;
  const anchorEnd = anchorStart + (vertical ? anchor.width : anchor.height);
  const extent = vertical ? panel.width : panel.height;
  const room = vertical ? viewport.width : viewport.height;
  const align = chooseAlign(
    preferredAlign,
    anchorStart + extent <= room,
    anchorEnd - extent >= 0,
  );
  const along = align === "start" ? anchorStart : anchorEnd - extent;
  const away = offsetBeside(side, anchor, panel, gap);

  return {
    top: clampIntoView(vertical ? away : along, viewport.height - panel.height),
    left: clampIntoView(vertical ? along : away, viewport.width - panel.width),
    placement: `${side}-${align}`,
  };
}
