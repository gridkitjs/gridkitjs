---
"@gridkitjs/react": minor
---

The grid prints. `"print"` in the toolbar's items is a Print button, `print`
in a context menu area a Print item, and `ref.current.print(options?)` prints
from code, resolving once the print dialog has closed. Each prints every row
the filter leaves — across every page and inside collapsed groups, not only
the rows drawn — through a hidden frame, titled with the grid's `label`, with
the header row repeated on every page and page numbers where the browser
supports them. A new `print` prop, a `PrintOptions`, sets the title, subtitle,
footer, timestamp, page and extra `styles`; a call's options go over it.
`PrintOptions` is re-exported. Print stays opt-in: `toolbar` alone does not
show the button.
