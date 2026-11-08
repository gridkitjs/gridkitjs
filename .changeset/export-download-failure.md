---
"@gridkitjs/react": patch
---

An export whose download the browser refuses is logged and announced as "Export failed", as a failing writer already was. It used to end in an unhandled promise rejection, or an exception thrown out of the menu item or `runCommand`, with nothing said to the user.
