---
"@gridkitjs/core": minor
---

New `filterDraftChanged(opened, draft)` tells whether a `FilterEditorDraft` changes anything since its editor opened, compared by value: a value unchecked and checked again, or the same conditions set again, is no change. An editor can close on Apply without calling `draftToFilter` when it returns `false`, so an untouched editor over a filter set in code leaves that filter as it is.
