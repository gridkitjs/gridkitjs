---
"@gridkitjs/react": minor
---

`DataGridProps.pageSizeOptions` is now grouped under a `pager` config object,
so future pager presentation options (a variant, a custom template) can land
without another breaking rename:

```diff
 <DataGridComponent
   paginated
-  pageSizeOptions={[10, 25, 50]}
+  pager={{ sizeOptions: [10, 25, 50] }}
 />;
```
