---
"@gridkitjs/core": minor
---

Breaking: `@gridkitjs/core` has a second entry point, `@gridkitjs/core/renderer`, for the building blocks only someone writing a renderer needs, and the names below are exported from it instead of the root. The root keeps the grid's data, options and state, its controller, commands, menus and toolbar options, data functions, messages, formatting and export. The renderer entry may change in a minor release. An app using `DataGrid` from `@gridkitjs/react` changes nothing; code importing a moved name changes its import:

```ts
// Before
import { createGridController, paginationWindow } from "@gridkitjs/core";

// After
import { createGridController } from "@gridkitjs/core";
import { paginationWindow } from "@gridkitjs/core/renderer";
```

Moved to `@gridkitjs/core/renderer`:

- Menus and context menus: `hasContextMenu`, `nextMenuIndex`, `typeaheadIndex`, `MenuMove`.
- Toolbar: `fitToolbarItems`, `isPinnedToolbarItem`, `splitToolbarItems`, `ToolbarFitInput`, `ToolbarSplit`, `searchTextOf`, `setSearchText`.
- Keyboard and focus: `buildKeyShortcuts`, `KeyShortcutCapabilities`, `clampFocus`, `nextFocusForKey`, `NavigationModifiers`. `GridFocus`, `headerFocus` and `bodyFocus` stay in the root.
- Column resizing: `beginColumnResize`, `applyColumnResize`, `revertColumnSize`, `sizeColumnToContent`, `clampColumnWidth`, `resolveColumnConstraints`, `fitColumnsToWidth`, `totalColumnWidth`, `KEYBOARD_STEP`, `ColumnResizeSession`. `resolveColumnWidths` and `DEFAULT_COLUMN_SIZES` stay in the root.
- Column and group-by drops: `resolveDropBefore`, `resolveKeyboardDropTarget`, `movesColumn`, `movesGroupBy`, `DropSide`.
- Selection: `intentOf`, `diffSelection`.
- Column chooser: `resolveColumnChooser`, `ColumnChooserEntry`, `ColumnChooserInput`, `ColumnChooserModel`, `ColumnChooserToggle`.
- Filter editor: `describeColumnFilter`, `columnValueOptions`, `initialFilterEditorDraft`, `filterEditorReducer`, `toValuesDraft`, `toConditionsDraft`, `selectAllState`, `visibleFilterOptions`, `draftToFilter`, `filterDraftChanged`, `ColumnFilterShape`, `ColumnValueOption`, `ColumnValueOptions`, `ColumnValueQuery`, `FilterEditorDraft`, `FilterEditorDraftBase`, `ValuesDraft`, `ConditionsDraft`, `FilterEditorAction`, `SelectAllState`; `resolveColumnFilterMenu`, `ResolvedColumnFilterMenu`; `filterOperatorFamily`, `filterOperandArity`, `parseFilterOperand`, `formatFilterOperand`; `conditionRowsFrom`, `conditionsFromRows`, `ConditionRowDraft`, `ParsedConditionRows`; `createColumnValueOptionsCache`, `ColumnValueOptionsCache`, `ColumnValueCacheQuery`; `filterChecklist`, `FilterChecklist`, `FilterChecklistItem`, `FilterChecklistOptions`. `isColumnFiltered`, `defaultFilterOperators`, `FilterOperatorFamily`, `DEFAULT_FILTER_VALUE_LIMIT` and the filter menu's option types stay in the root.
- Paging and virtualization: `paginationWindow`, `PaginationWindowEntry`, `visibleRange`, `VisibleRange`, `RowHeights`.
- Copy and print: `copyContent`, `CopyRequest`, `CopySource`, `buildPrintDocument`. `CopyContent`, `exportPrintDocument` and the print types stay in the root.
