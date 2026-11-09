---
"@gridkitjs/core": minor
---

**Breaking:** `GroupExpansionState` is a mode with exceptions,
`{ mode: "allExpanded" | "allCollapsed"; except: readonly string[] }`, in
place of the bare list of collapsed group ids. `defaultGroupExpansion`,
`groupExpansion`, `setGroupExpansion` and the `expansion` in
`onGroupExpansionChange`'s event all take or carry the new shape.

```ts
// Before
createGridController({ defaultGroupExpansion: [groupRowId(["West"])] });
// After
createGridController({
  defaultGroupExpansion: {
    mode: "allExpanded",
    except: [groupRowId(["West"])],
  },
});
```

The event payload changes the same way: an expand-all reports
`{ groupId: null, expansion: [] }` before and
`{ groupId: null, expansion: { mode: "allExpanded", except: [] } }` after. A
reader of the state asks `isGroupExpanded` rather than checking the list:
`!expansion.includes(groupId)` before, `isGroupExpanded(expansion, groupId)`
after.

`collapseAllGroups` (the controller action, the `group.collapseAll` command
and the function) now collapses every group, including those hidden under a
collapsed parent and those that appear later, where it used to collapse only
the groups on screen. The function takes the current expansion in place of
the display rows: `collapseAllGroups(view.displayRows)` before,
`collapseAllGroups(expansion)` after. New exports: `isGroupExpanded`,
`ALL_EXPANDED`, `ALL_COLLAPSED`.

Saved state still restores: `restoreState` reads a `groupExpansion` saved as
a bare list as `{ mode: "allExpanded", except: list }`, and
`serializeGridState` writes the new shape.
