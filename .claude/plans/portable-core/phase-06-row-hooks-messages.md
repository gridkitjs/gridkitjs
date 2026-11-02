# Phase 06: Row hooks, simple multi-select, messages

> Part of [Portable core](MASTER.md). Status is tracked only in the master. When done, reply
> with the standard phase report (the delegator gives you the format).

## Goal

Three small, additive gaps real apps hit immediately: a row double-click callback and a per-row
props hook (class name and data attributes, including a stable row-id attribute); a
"simple" multi-select behaviour where a plain click toggles a row; and a typed `messages`
option so every built-in string (pager, group-by bar, loading row, live-region announcements)
can be localised instead of being hard-coded English. All three are options in `GridOptions`,
so a future renderer gets them by contract.

## Read first

- `DESIGN.md#3` (options conventions), `#5` (selection actions).
- `packages/react/src/DataGrid/components/GridRow.tsx` (row attributes; it is `memo`-ised with
  scalar props — keep it that way), `components/GridBody.tsx` (delegated events, `cellFrom`,
  `select()`), `components/GridPager.tsx`, `components/GroupByBar.tsx` (hard-coded strings),
  `DataGrid.tsx` (announcement strings in `handle*` functions),
  `useGridSelection.ts` (announcement strings; `keyboardSelectIntent`).
- `packages/core/src/util/selection.ts#intentOf`: where click modifiers become an intent.
- `apps/playground/tests-ct/selection.spec.tsx`, `accessibility.spec.tsx`,
  `pagination.spec.tsx`: tests asserting today's strings and click semantics.

## Starting point

- (From Phase 03) Boolean cell text ("true"/"false") and the group header's "(blank)" are
  candidates for `messages`.
- Rows render `data-gridkit-row-index` only; there is no row-id attribute and no
  `onRowDoubleClick`/`onRowClick`.
- Selection intent: plain click `replace`, Ctrl/Cmd `toggle`, Shift `range` (`intentOf`);
  Space acts like Ctrl (`keyboardSelectIntent`). `SelectableConfig.rows` is `false | "single" |
"multiple"`.
- Strings live in JSX and template literals: `GridPager` ("Pagination", "Previous", "Next",
  "Rows per page", `Page ${n}`), `GridBody` ("Loading more…"), `GroupByBar` ("Grouped by",
  "Stop grouping by …", drop placeholder), announcements in `DataGrid.tsx` (resize, sort,
  group, expansion, order, page) and `useGridSelection.ts` (count messages).
- After Phase 04, `GridOptions` exists in core and the controller fires selection events.

## Tasks

### Part A: row hooks and simple multi-select

1. Add to `GridOptions`: `onRowClick?`, `onRowDoubleClick?: (event: RowPointerEvent<Row>) =>
void` with `RowPointerEvent { row: ResolvedRow<Row>; columnId: string | null; native:
{ ctrlKey; metaKey; shiftKey; altKey; button } }` (no DOM type in the payload), and
   `getRowProps?: (row: ResolvedRow<Row>) => { className?: string; attributes?:
Readonly<Record<\`data-${string}\`, string>> }`. React: wire both through `GridBody`'s
delegated `onClick`/`onDoubleClick`(group rows excluded), pass`getRowProps`results into`GridRow`as two scalar/stable props (compute in`GridBody`, memo-friendly). Every row also
gets `data-gridkit-row-id={rowId}`by default. Acceptance: CT tests: double-click fires once
with the right row and column;`getRowProps`class and`data-*`land on the`<tr>`; `memo`
   still prevents re-render of untouched rows (assert via a render-count template in a fixture).
2. Add `selectable.rows: "multiple"` companion option `selectable.toggleOnClick?: boolean`
   (default `false`): when true, a plain click toggles instead of replacing; Shift-range and
   Ctrl behave as before. Implement in core (`intentOf` gains an options arg or a sibling
   `intentFor(modifiers, { toggleOnClick })`). Acceptance: core unit tests; a CT test clicking
   three rows selects three; `selection.spec.tsx` unchanged.
3. Docs: `events.mdx` (row events), `data-grid.mdx` (`getRowProps`), `rows/row-selection.mdx`
   (`toggleOnClick`). Changesets: `core` minor, `react` minor.

### Part B: messages

1. Define `GridMessages` in core (`packages/core/src/messages.ts`): every string above as a
   key, with function values where interpolation is needed (`page: (n, count) => string`,
   `columnResized: (name, px) => string`, `selectedCount: (n, noun) => string`, …), and
   `defaultMessages: GridMessages` in English, equal to today's strings byte for byte. Add
   `messages?: Partial<GridMessages>` to `GridOptions` and `resolveMessages(partial)`.
   Acceptance: a test that every key has a default; a snapshot of `defaultMessages`.
2. React: replace every hard-coded string with `messages.<key>`; announcements build through
   the same functions. Acceptance: all existing CT tests pass unchanged (the defaults are
   identical); a new CT test passes a custom `messages.previous` and asserts the pager text.
3. Docs: `packages/react/docs/localization.mdx` (new, `_meta.json`): the keys table, an example
   with two locales, how `locale` (formatting, Phase 03) and `messages` (strings) divide the
   work. Changesets: `core` minor, `react` minor.

## Done when

- [ ] `onRowClick`, `onRowDoubleClick`, `getRowProps`, `data-gridkit-row-id` exist and are tested.
- [ ] `selectable.toggleOnClick` works; default behaviour unchanged.
- [ ] No English string remains hard-coded in `packages/react/src`; `defaultMessages` matches
      today's text; custom messages render.
- [ ] `GridRow` stays `memo`-ised with scalar props.
- [ ] Changesets; docs (`events.mdx`, `data-grid.mdx`, `row-selection.mdx`, `localization.mdx`).
- [ ] Full CI sequence green; Playwright suite unchanged and green plus new tests.
- [ ] Code follows the master's quality bar (`AGENTS.md`).

## Verify

- `grep -rn '"[A-Z][a-z]' packages/react/src --include=*.tsx | grep -v className | grep -v
aria-` should surface no user-facing English literal (review the remaining hits).
- `pnpm --filter playground test:e2e`: unchanged tests green.

## Decisions already made

- Event payloads carry no DOM types (`DESIGN.md#2`, renderer-neutral contracts).
- Defaults are byte-identical to today's strings so no test changes.
- Boolean cell text (`"true"`/`"false"`, Phase 03) may become `messages.booleanTrue/False`
  here: default yes, routed through `formatCellValue`'s caller.

## Open choices

- `toggleOnClick` name vs `clickToggles`: default `toggleOnClick`.
- Whether `getRowProps` also allows `style`: default no (theme owns styling).

## Out of scope

- Context menu / right-click events (next plan). Column-level attributes (exist:
  `headerClassName`/`cellClassName`). RTL.

## Suggested commits

- `feat(core): add row pointer events, getRowProps and toggleOnClick to GridOptions`.
- `feat(react): fire row click events, apply getRowProps, add data-gridkit-row-id`.
- `feat(core): add GridMessages with English defaults`.
- `feat(react): render every built-in string from messages`.
- `docs(react): add localization page`.

## Docs to update

- `packages/react/docs/events.mdx`, `data-grid.mdx`, `rows/row-selection.mdx`,
  `localization.mdx` (new) + `_meta.json`.
