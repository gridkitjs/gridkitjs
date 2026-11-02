# Phase 07: `@gridkitjs/dom`: behaviours out of React

> Part of [Portable core](MASTER.md). Status is tracked only in the master. When done, reply
> with the standard phase report (the delegator gives you the format).

## Goal

A new vanilla-TypeScript package, `@gridkitjs/dom`, owns every browser behaviour the grid needs
(pointer gestures, element width, infinite-scroll trigger, row virtualizer measurement,
keyboard focus movement, a live-region announcer, and an overlay primitive the next plan's menus
need). Each behaviour is `attach(element, options) → detach()` with framework-free types;
`@gridkitjs/react` wraps each in a small hook. After this phase the React package is markup,
templates and glue, and a second renderer reuses `core` + `dom` unchanged.

## Read first

- `DESIGN.md#2` (layers, contract table), `#8` (migration rules).
- The hooks to migrate, in this order: `packages/react/src/DataGrid/useInfiniteScroll.ts`,
  `useElementWidth.ts`, `pointerGesture.ts` + `useColumnResize.ts` + `measureColumnContent.ts`,
  `useDragReorder.ts` + `useColumnDrag.ts` + `useGroupByDrag.ts` + `groupByDropTarget.ts`,
  `useRowVirtualizer.ts`, `useGridNavigation.ts`.
- `packages/core/package.json`, `tsup.config.ts`, `tsconfig.json`: the template for the new
  package. `pnpm-workspace.yaml`, `.changeset/config.json`, `apps/playground/package.json`,
  `apps/playground/playwright-ct.config.ts` (`coveragePlugin.include`).
- `AGENTS.md#Structure`: the package table to extend.

## Starting point

- `pointerGesture.ts#startPointerGesture(element, pointerId, handlers)` is already a plain
  function; `useDragReorder` holds drag state in React (`draggedId`, `dropTarget`,
  `ghostTransform`) and a `dragged` ref; `useRowVirtualizer` keeps a mutable height cache in
  refs and pushes `range` into state; `useInfiniteScroll` is a three-flag machine over one
  `IntersectionObserver`; `useGridNavigation` owns `focus` state and a pending-focus effect that
  retries when the target row is not mounted (virtualization).
- After Phase 04, state writes go through the controller (`resizeColumn`, `moveColumn`,
  `moveGroupBy`, …); the hooks only produce coordinates/targets. Focus (`GridFocus`) is read by
  `DataGridApi.getFocusedCell` and notifies subscribers, so it must keep a subscribe path.
- Playwright CT coverage is instrumented only for `packages/react/src/DataGrid/**`.
- `theme-tailwind` is untouched: class names stay as they are.

## Tasks

### Part A: the package, overlay, announcer

1. Scaffold `packages/dom` (`@gridkitjs/dom`, `0.0.0` + a `minor` changeset → `0.1.0`): copy
   `core`'s `package.json` shape (`exports` → `src/index.ts`, `publishConfig` → `dist`), `tsup`,
   `tsconfig` extending base with `"lib": ["ES2025", "DOM", "DOM.Iterable"]`. Behaviour tests
   stay in Playwright CT (real layout), not jsdom; the `test` script is `vitest run
--passWithNoTests`, used only for pure helpers such as the overlay placement math. Add `@gridkitjs/dom` as a dependency of `react` and of `playground`; add
   `packages/dom/src/**` to `coveragePlugin.include`; extend `AGENTS.md`'s package table and the
   boundary sentence (core bans `@gridkitjs/dom`; `dom` bans `react`, enforce in ESLint).
   Acceptance: `pnpm build` produces `packages/dom/dist`; lint rules in place.
2. `createLiveAnnouncer(container?)`: owns one visually-hidden `role="status" aria-live="polite"`
   element, `announce(text)` (re-announces identical text by toggling), `destroy()`. React: the
   `announcement` state and `.gridkit-sr-only` div in `DataGrid.tsx` are replaced by it.
   Acceptance: `accessibility.spec.tsx` passes unchanged.
3. `attachOverlay(anchor | point, panel, { placement, gap, onDismiss, returnFocusTo })` with
   pure `placeOverlay(anchorRect, panelSize, viewport, gap)` (flip + clamp; pure math, so it
   gets Vitest tests inside `dom` under the node environment), dismissal on
   Escape, outside pointerdown, scroll, resize, blur; focus moved in and returned on close.
   No React consumer yet; a CT fixture in `apps/playground/tests-ct/support/OverlayHarness.tsx`
   exercises it. Acceptance: CT tests for placement flip at the viewport edge, each dismissal,
   focus return.

### Part B: observers and gestures

1. Move `useInfiniteScroll` → `attachInfiniteScroll(root, sentinel, options) → detach` with
   `update(options)`; React hook becomes ~15 lines. Acceptance: `infinite-scroll.spec.tsx`
   unchanged.
2. Move `useElementWidth` → `observeElementWidth(element, onWidth) → disconnect`. Acceptance:
   `column-resize.spec.tsx` fit-mode tests unchanged.
3. Move resize: `startColumnResizeGesture(handle, pointerEvent, session, { onMove(width),
onEnd(width), onCancel })` using `startPointerGesture`; `measureColumnContent` moves as is.
   `useColumnResize` keeps only `activeColumnId` React state and calls `controller.resizeColumn`.
   Add `event.button === 0 && event.isPrimary` guards in the gesture starters (a right-click must
   not start a drag or resize). Acceptance: `column-resize.spec.tsx` unchanged; a new test that a
   right-button pointerdown on the handle does not start a resize.

### Part C: reorder, virtualizer, navigation

1. Move `useDragReorder` mechanics → `startDragReorder(id, grabElement, pointerEvent,
{ resolveTarget, onState({ draggedId, dropTarget, ghostTransform }), onDrop })`; hit-testing
   (`elementAt`, `sideOf`, `groupByDropTarget`) moves too. React keeps the three transient
   values in one `useState` fed by `onState`. Same button guard. Acceptance: `column-reorder`,
   `group-by-drag` specs unchanged; right-button test.
2. Move the virtualizer → `createRowVirtualizer(scrollElement, { estimatedRowHeight, overscan,
onRange })` with `setRowCount(n)`, `resetHeights()`, `measureRow(index) → ref callback`,
   `scrollToIndex(index, options)`, `destroy()`; the pure `visibleRange` stays in core. React
   hook holds `range` state fed by `onRange`. Acceptance: `row-virtualization.spec.tsx`
   unchanged (including the Phase 01 fix).
3. Move navigation → `createGridFocus({ getHeaderRow, getBodyRow, rowCount, columnCount,
isSkippableRow, virtualizer? })` with `focusCell`, `handleKey(key, modifiers, pageSize)`,
   `subscribe`; pure `clampFocus`/`nextFocusForKey` stay in core. React hook subscribes and
   exposes the same `GridNavigationApi`. Acceptance: `keyboard-navigation.spec.tsx`,
   `accessibility.spec.tsx` unchanged; `getFocusedCell()` still notifies `use*State`-style
   subscribers.
4. Docs: `packages/dom/README.md`, `packages/dom/docs/overview.mdx` + `_meta.json` (what the
   package is for, the `attach → detach` contract, one example per behaviour, "you only need
   this to write a renderer"); root `README.md` package table; `AGENTS.md`. Changesets: `dom`
   minor, `react` minor (new dependency; behaviour unchanged → still minor because the dependency
   graph changed).

## Done when

- [ ] `@gridkitjs/dom` builds, is published-shaped, lint-fenced (no React), and documented.
- [ ] Announcer, overlay, infinite scroll, element width, resize gesture, drag-reorder,
      virtualizer and focus movement live in `dom` with framework-free signatures.
- [ ] `packages/react/src/DataGrid` contains components, thin hooks and `DataGrid.tsx` only;
      no `IntersectionObserver`/`ResizeObserver`/`setPointerCapture`/`elementFromPoint` call
      remains in `react` (grep).
- [ ] Playwright suite unchanged and green plus new tests; coverage job includes `dom`.
- [ ] Changesets; docs; `AGENTS.md` package table updated.
- [ ] Code follows the master's quality bar (`AGENTS.md`).

## Verify

- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- `pnpm --filter playground test:e2e` and `test:e2e:coverage` (threshold still met with `dom`
  included; report the numbers).
- `grep -rnE "IntersectionObserver|ResizeObserver|setPointerCapture|elementFromPoint"
packages/react/src` returns nothing.

## Decisions already made

- `dom` is a published package (pre-flight 4 default). Contract shape `attach → detach`,
  callbacks, no framework types: `DESIGN.md#2`, `#8`.
- Transient gesture state stays in the renderer, fed by behaviour callbacks (not controller state).
- Right-button/non-primary pointers never start a gesture.

## Open choices

- Package folder name `packages/dom` vs `packages/behaviors`: default `dom`, matching the npm
  name.
- Whether `measureColumnContent` returns a `number | null` or a richer object: default unchanged.

## Out of scope

- Any menu/toolbar component (next plan uses the overlay). A second renderer. Changing the
  theme. Touch long-press.

## Suggested commits

- `feat(dom): add the @gridkitjs/dom package`: scaffold + changeset + AGENTS/README.
- `feat(dom): add live announcer`; `refactor(react): announce through @gridkitjs/dom`.
- `feat(dom): add overlay primitive` + CT harness.
- One `refactor(react): move <behaviour> to @gridkitjs/dom` per behaviour (B1, B2, B3, C1, C2,
  C3), each with its `feat(dom): add <behaviour>` commit first.
- `docs(dom): add overview`.

## Docs to update

- `packages/dom/README.md`, `packages/dom/docs/overview.mdx`, `packages/dom/docs/_meta.json`;
  `README.md`; `AGENTS.md`; `packages/react/docs/overview.mdx` (one sentence on the layers).
