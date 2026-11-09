---
"@gridkitjs/react": patch
---

An export chosen while another is still being written no longer runs its writer. It was dropped unsaved before, but only after building its file.
