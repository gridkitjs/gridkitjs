import type { ReactNode } from "react";
import type { BuiltInCommandIcon } from "@gridkitjs/core";
import { GroupIcon, Icon } from "../icons";

/** A glyph for every icon key the built-in commands carry. */
const BUILT_IN_ICONS: Readonly<Record<BuiltInCommandIcon, () => ReactNode>> = {
  sortAscending: () => (
    <Icon>
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
      <path d="M11 12h4" />
      <path d="M11 16h7" />
      <path d="M11 20h10" />
    </Icon>
  ),
  sortDescending: () => (
    <Icon>
      <path d="m3 16 4 4 4-4" />
      <path d="M7 20V4" />
      <path d="M11 4h10" />
      <path d="M11 8h7" />
      <path d="M11 12h4" />
    </Icon>
  ),
  group: () => <GroupIcon />,
  hide: () => (
    <Icon>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="m2 2 20 20" />
    </Icon>
  ),
  autoFit: () => (
    <Icon>
      <path d="m18 8 4 4-4 4" />
      <path d="M2 12h20" />
      <path d="m6 8-4 4 4 4" />
    </Icon>
  ),
};

/**
 * Looked up through a `Map`, since an item's key may be any string an app
 * chose, and one such as `"toString"` must find nothing rather than
 * something on `Object.prototype`.
 */
const ICONS = new Map(Object.entries(BUILT_IN_ICONS));

/** The icon a key names, or nothing for a key the grid has no glyph for. */
export function MenuIcon({ name }: { name: string | undefined }) {
  const draw = name === undefined ? undefined : ICONS.get(name);
  return draw === undefined ? null : draw();
}

/** What a checked item shows in place of its icon. */
export function CheckIcon() {
  return (
    <Icon>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

/** Marks an item that opens a submenu. */
export function ChevronRightIcon() {
  return (
    <Icon>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}
