import type React from "react";

/**
 * Lays `children` out right to left, as a page does that sets `dir` on a
 * wrapper rather than on `<html>`. The grid inside, and the menus and panels
 * it portals to `document.body`, have only this wrapper to take their
 * direction from.
 */
export default function RightToLeft({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <div dir="rtl">{children}</div>;
}
