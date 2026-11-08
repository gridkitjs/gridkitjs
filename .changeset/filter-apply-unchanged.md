---
"@gridkitjs/react": patch
---

OK in a filter menu that changes nothing leaves the column's filter as it is, and `onFilterChange` hears nothing. Before, the excel editor removed a filter set in code (conditions, or a custom filter) once a value had been unchecked and checked again, or "Select all" pressed twice; and the simple editor rewrote the column's own conditions on an untouched OK: two top-level conditions came back as one group, and a date set as a string as a `Date`. A value typed into the simple editor and taken out again now closes the menu on OK, as an untouched one does, rather than marking the box invalid.
