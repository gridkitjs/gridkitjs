---
"@gridkitjs/react": patch
---

`DataGrid` now renders on the server: a Next.js App Router page that prerenders a grid no longer fails with "Missing getServerSnapshot", and the grid hydrates on the client without a mismatch, so it no longer needs a client-only wrapper. The `use*State` hooks such as `usePaginationState` render their pre-mount values on the server too.
