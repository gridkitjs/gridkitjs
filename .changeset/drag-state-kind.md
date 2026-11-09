---
"@gridkitjs/dom": minor
---

Breaking: `DragReorderState`, what `startDragReorder` reports through
`onState`, is a union tagged `kind`. While nothing is dragged it is
`{ kind: "idle" }` (`NO_DRAG`, reported on release and cancel alike); once a
press has become a drag it is `{ kind: "dragging", draggedId, dropTarget,
ghostTransform }`, with `draggedId` and `ghostTransform` no longer nullable.
A reader that tested for `null` checks `kind` instead, and reads the fields
only while dragging:

```ts
// Before
onState: (state) => {
  if (state.draggedId === null) clearDrag();
  else drawDrag(state.draggedId, state.ghostTransform);
};

// After
onState: (state) => {
  if (state.kind === "idle") clearDrag();
  else drawDrag(state.draggedId, state.ghostTransform);
};
```
