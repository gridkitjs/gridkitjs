---
"@gridkitjs/react": minor
---

Under `dataMode: "server"`, the result of a toolbar search or a filter menu is announced once the server's rows arrive: at the first render after the change whose `dataSource` is a new array, while `loading` is off, with the count from `rowCount`. A filter menu announces the count alone there, the `searchResults` message ("12 rows found"), since the grid knows no total without the filter. Client grids announce as before, as soon as the rows are drawn.
