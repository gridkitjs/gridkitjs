---
"@gridkitjs/react": patch
---

A header click after a column drag cancelled with Escape is no longer
swallowed. When the button was released away from the header, the next click
on any header, including one that cannot be dragged, used to be taken for the
end of the cancelled drag and did nothing.
