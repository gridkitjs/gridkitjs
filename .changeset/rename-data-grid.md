---
"@gridkitjs/react": minor
---

**Breaking:** the grid component is renamed from `DataGridComponent` to
`DataGrid`, matching its `DataGridProps` and `DataGridApi` types. There is no
deprecated alias — update the import and every JSX use:

```tsx
// before
import { DataGridComponent } from "@gridkitjs/react";
<DataGridComponent columns={columns} dataSource={rows} />;

// after
import { DataGrid } from "@gridkitjs/react";
<DataGrid columns={columns} dataSource={rows} />;
```

Development warnings logged by the grid are now prefixed `DataGrid:` instead
of `DataGridComponent:`.
