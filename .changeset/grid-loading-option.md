---
"@gridkitjs/core": minor
---

`GridOptions` adds `loading`, for the app to say it is fetching rows: a renderer shows it over the rows it already draws, marks the grid busy and announces it, and changes nothing else. The grid never sets it itself. `GridMessages` adds `loading` ("Loading…"), the text shown and announced; a translation without it shows the English default.
