---
"@gridkitjs/react": patch
---

A column or group-by chip drag resolves its drop targets, and drops, against the column order and grouping of the latest render. A controlled `columnOrder` that changed mid-drag used to have the drop land by the order the drag began with.
