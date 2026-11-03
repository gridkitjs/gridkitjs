import type { ReactNode } from "react";

/** The common attributes behind every icon the grid draws — just the `<path>`s differ. */
export function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * The two glyphs a sort toggle shows: a neutral hint before a column has a
 * direction, and a single chevron reused for both directions once it does —
 * `theme-tailwind` rotates it 180° for `desc` rather than swapping icons.
 */
export function ChevronsUpDownIcon() {
  return (
    <Icon>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </Icon>
  );
}

export function ChevronUpIcon() {
  return (
    <Icon>
      <path d="m18 15-6-6-6 6" />
    </Icon>
  );
}

/** Three stacked panes, standing in for "group by this column". */
export function GroupIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="8.5" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}
