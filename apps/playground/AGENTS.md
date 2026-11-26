# playground

The Vite app GridKit is developed against, and the home of the Playwright
component tests for `@gridkitjs/react`, `@gridkitjs/dom`,
`@gridkitjs/forms-dom` and `@gridkitjs/forms`. Private, never published, so
it needs no changeset.

## Layout

| Path                       | What it holds                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`              | The grid page `pnpm dev` serves at `/`, built from the grids in `src/demos/`.                                    |
| `src/index.css`            | Tailwind plus `@gridkitjs/theme-tailwind/styles.css`, shared with the tests.                                     |
| `src/PresetSwitcher.tsx`   | Picks a theme preset; `?preset=<id>` links to one.                                                               |
| `src/presets.ts`           | The theme's presets and `usePresetStyle`, which loads one after the stylesheets.                                 |
| `src/Walkthrough.tsx`      | One grid alone on a page: `/?demo=tour`, `grouped`, `pinned` or `server`, `&dir=rtl`.                            |
| `forms.html`, `src/forms/` | The [forms page](#forms-page) at `/forms.html`: page controls, an event log and one section per forms component. |
| `tests-ct/`                | Playwright component tests, one spec file per area.                                                              |
| `tests-ct/support/`        | Test-only grids and harnesses the specs mount, plus coverage setup.                                              |
| `playwright/index.tsx`     | The component-test entry; it imports `src/index.css`.                                                            |
| `playwright-ct.config.ts`  | The suite's config: the browsers and phones, the Vite plugins, coverage.                                         |

Packages resolve to source, so editing a package hot-reloads the app; run it
from the repo root with `pnpm dev` (see the root
[Development](../../AGENTS.md#development) section).

## Forms page

`forms.html` is a page of its own, a second Vite entry that `vite build`
builds beside `index.html`. It loads `@gridkitjs/theme-tailwind/forms.css`
and the forms packages alone, never `styles.css` or a grid package (ESLint
refuses a grid import under `src/forms/`), so it shows the forms work
without the grid.

**Every forms component gets a section on this page showing every state it
has, wired to the event log.** A section is a component in
`src/forms/demos/`, wrapped in `DemoSection` and listed in
`FormsPlayground.tsx`. It reads the page controls with
`usePlaygroundSettings()` (preset, colour scheme, right to left, density,
mode, `disabled`, `readOnly`, locale) and passes them to what it shows; the
page itself applies the preset, the colour scheme, `dir` and `lang` to the
document. It reports events through `useEventReporter("<component>")`:
`onChange={reporter("onChange")}` logs each call with its `value`,
`previousValue`, `text`, `source`, `trigger` and native event type, so a
forms event object goes in as it is. The controls keep their choices in the
URL, so a combination can be linked to.

`tests-ct/forms-playground.spec.tsx` checks the page's controls and log.
The component-test build generates no Tailwind utilities, so it reads a
utility class where the page would show a size.

## Component tests

The suite in `tests-ct/` mounts `DataGrid` in isolation through
`@playwright/experimental-ct-react` rather than through the playground's own
demo (`App.tsx`), against the real `theme-tailwind` stylesheet so measured
widths and paddings are real ones.

It runs in three desktop browsers, one Playwright project each: `chromium`
(Desktop Chrome), `firefox` (Desktop Firefox) and `webkit` (Desktop Safari).
Two phone projects with a touch screen, `chromium-touch` (Pixel 7) and
`webkit-touch` (iPhone 15), run only the tests tagged `@touch`, which the
desktop projects leave out; `touch.spec.tsx` holds them.

```bash
pnpm --filter playground test:e2e                     # run the suite in every project
pnpm --filter playground test:e2e --project=firefox   # one browser
pnpm --filter playground test:e2e:ui                  # same, with Playwright's UI
pnpm --filter playground test:e2e:coverage            # Chromium, instrumented; enforces 80% line/statement/function coverage over DataGrid/, dom, forms-dom and forms
pnpm --filter playground exec playwright install chromium firefox webkit   # once, on a fresh machine
```

Coverage comes from the Chromium project alone. Each coverage file is named
by its test's id, which the three projects share, and one browser is enough
to measure what the tests reach. CI runs each project as its own job:
desktop Chromium with coverage, the others without, each retried once.

`test:e2e` is not part of `pnpm test` and does not run under `pnpm -r test`,
by design — it's a separate, slower check, invoked explicitly rather than on
every `pnpm test` (CI runs it as its own job, see the root
[Standards](../../AGENTS.md#standards) section).

`tests-ct/` holds one spec file per area — `rendering`, `column-resize`,
`keyboard-navigation`, `selection`, `row-virtualization` and so on — so add
to whichever one already covers the area being changed. A spec imports `test`
and `expect` from `./support/coverage` (the only way coverage is collected) and
mounts the grid with `mountGrid` from `./support/mountGrid`; copy the imports
of a neighbouring spec such as `keyboard-navigation.spec.tsx`.

### A test that passes in every browser

A test may differ per browser only where the browser itself differs, and
says why next to the difference. What the suite already handles:

- **Clipboard.** Playwright grants clipboard permissions in Chromium alone,
  so `clipboard.spec.tsx` asks for them there only. Firefox reads the real
  clipboard without them. WebKit refuses a read no user gesture started, so
  there the spec's `recordCopies` notes what the grid handed the browser to
  copy, and the spec reads that. Two tests of a copy the browser makes itself
  (text highlighted in a cell, a text field inside a cell) skip in WebKit
  with `NATIVE_COPY_UNREADABLE`: the grid hands over nothing to record.
- **Print.** No headless browser shows a print dialog, and each fakes it
  differently, so print tests stand in for it with
  `support/printRecorder.ts` in every browser.
- **Focus on click.** WebKit, like Safari, does not focus a button that is
  clicked. A harness button a test clicks and then expects focus on carries
  `tabIndex={0}`.
- **The mouse's `pointerId`.** Firefox numbers it from 0, Chromium and
  WebKit from 1. A test that names the mouse's pointer presses with
  `support/pressMouse.ts`, which returns the id the browser gave it.
- **Tab, then a scrolling key.** WebKit scrolls an element focused by Tab
  into view a frame later, undoing a scroll made straight after it. A test
  that Tabs into a scroll container and then presses a key that scrolls it
  (End in a long checklist) calls `waitForFocusReveal` from
  `support/focusReveal.ts` in between.
- **Typing a date.** WebKit on Linux sets a date field only from its
  picker and ignores typed digits, so a test that types into one skips
  there with `DATE_FIELD_TAKES_NO_TYPING`. WebKit on Windows takes typing.
- **Pixel widths.** `getBoundingClientRect()` can differ in the fifth
  decimal place for boxes of the same computed width. A test comparing
  widths rounds them first.
- **An input method.** Playwright drives one only in Chromium, through the
  DevTools protocol. `support/forms/compose.ts` composes there for real and
  dispatches the composition's events in Firefox and WebKit, so a forms
  composition test runs in all three.
- **Dropping text.** Playwright cannot drag a text selection, and a
  dispatched `drop` inserts nothing, so a forms drop test dispatches the
  `beforeinput` and `input` a drop fires.

### A touch test

A touch test is tagged `@touch` (`touch.spec.tsx` tags its whole
`describe`), so it runs in the phone projects alone. Taps go through
`page.touchscreen.tap`, a real touch in both. Playwright has no touch that
rests or moves, so `support/touchscreen.ts` drives one through the DevTools
protocol, which only Chromium speaks: a long-press or a swipe skips in
`webkit-touch` with `TOUCH_DRAG_UNAVAILABLE`. A synthetic `pointerdown` is
no stand-in for a drag there, since pointer capture refuses a pointer the
browser never saw. The component-test page sets a `width=device-width`
viewport, as a real mobile page does, so a phone lays it out at its own
width rather than at 980px; desktop projects ignore it.

### Stale styles after a stylesheet edit

Playwright caches the component-test build in `playwright/.cache`. After
editing `packages/theme-tailwind/src/styles.css`, delete that folder before
`test:e2e`, or the run tests the old styles. `test:e2e:coverage` deletes it
on its own.

## Other commands

```bash
pnpm --filter playground typecheck
pnpm --filter playground lint        # src, tests-ct and playwright
```

[.claude/rules/docs.md](../../.claude/rules/docs.md#code-samples-and-style)
checks a docs code sample with these two.
