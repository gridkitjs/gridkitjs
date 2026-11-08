---
"@gridkitjs/react": patch
---

The `use*State` hooks follow a grid that mounts after them. A hook called in the component that renders `DataGrid` only once its data has arrived used to stay on its fallback value for good; it now subscribes from the render that mounts the grid, and moves to a new grid when the ref's grid is swapped.
