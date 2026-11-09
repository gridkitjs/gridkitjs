---
"@gridkitjs/dom": minor
---

Breaking: `createGridFocus`'s `focusCell` takes the cell as one `GridFocus`
from `@gridkitjs/core` instead of a row and a column, and `getFocus()`
returns that shape, which names the header as an area instead of row `-1`.

```ts
import { bodyFocus, headerFocus } from "@gridkitjs/core";

// Before
focus.focusCell(rowIndex, columnIndex);
focus.focusCell(HEADER_ROW, columnIndex);
const onHeader = focus.getFocus().rowIndex === HEADER_ROW;

// After
focus.focusCell(bodyFocus(rowIndex, columnIndex));
focus.focusCell(headerFocus(columnIndex));
const onHeader = focus.getFocus().area === "header";
```
