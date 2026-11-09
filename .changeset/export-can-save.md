---
"@gridkitjs/core": patch
---

`GridCommandHost` takes an optional `canSave()`. The export commands ask it before building a file and, while it returns `false`, build nothing and do not run, so a host that would drop the file never has its writer run.
