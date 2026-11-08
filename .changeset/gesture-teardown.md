---
"@gridkitjs/react": patch
---

`DataGrid` ends a column drag or resize when the grid unmounts, or when the
column being dragged is hidden mid-gesture. Either used to leave the gesture
listening for Escape: a hidden column's drag kept the group-by bar open and
its ghost came back with the column, and the first Escape afterwards cancelled
the dead gesture instead of clearing the selection. A resize cut short this
way now puts the column back to its starting width, as Escape does.
