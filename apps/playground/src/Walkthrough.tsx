import { useEffect, type ReactNode } from "react";
import { PinnedColumnsGrid } from "./demos/PinnedColumnsGrid";
import { WalkthroughGrid } from "./demos/WalkthroughGrid";
import { WalkthroughGroupedGrid } from "./demos/WalkthroughGroupedGrid";

const DEMO_PARAM = "demo";
const DIRECTION_PARAM = "dir";

interface WalkthroughDemo {
  readonly title: string;
  readonly render: () => ReactNode;
}

/**
 * One grid at a time, each on a page of its own so a screen reader meets
 * nothing but a heading and the grid. Opened as `/?demo=<id>`.
 */
const demos: Readonly<Record<string, WalkthroughDemo>> = {
  tour: {
    title: "Orders grid",
    render: () => <WalkthroughGrid />,
  },
  grouped: {
    title: "Grouped orders grid",
    render: () => <WalkthroughGroupedGrid />,
  },
  pinned: {
    title: "Pinned columns",
    render: () => <PinnedColumnsGrid />,
  },
};

/** The demo the URL names, or `undefined` for the full playground page. */
export function walkthroughDemoFromUrl(): WalkthroughDemo | undefined {
  const id = new URLSearchParams(window.location.search).get(DEMO_PARAM);
  return id === null ? undefined : demos[id];
}

/** The demo's page. `&dir=rtl` lays it out right to left. */
export function Walkthrough({ demo }: { readonly demo: WalkthroughDemo }) {
  const rtl =
    new URLSearchParams(window.location.search).get(DIRECTION_PARAM) === "rtl";

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.title = demo.title;
  }, [demo, rtl]);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-xl font-bold">{demo.title}</h1>
      {demo.render()}
    </main>
  );
}
