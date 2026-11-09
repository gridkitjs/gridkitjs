---
"@gridkitjs/react": patch
---

The filter menu's editors read `@gridkitjs/core`'s `FilterEditorDraft` by its `kind`: the excel editor's checklist holds a `ValuesDraft`, and the simple editor builds a `ConditionsDraft` directly. Nothing a user sees changes; "Back to values" still brings the checklist back as it was left.
