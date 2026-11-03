---
"@gridkitjs/dom": minor
---

`attachMenu(panel, options)` makes a `role="menu"` panel a renderer drew
behave as a menu, following the WAI-ARIA menu pattern. Items are found by
their menu item role and `data-gridkit-menu-item` id, with one of them the tab
stop. The arrow keys, Home, End and typeahead move focus among them; Enter,
Space and a click choose one (`onActivate`), never a disabled one; ArrowRight,
or the pointer resting on a submenu item, asks for its submenu
(`onOpenSubmenu`), and ArrowLeft in a submenu asks to close it
(`onCloseSubmenu`); resting on another item asks to close the open submenu
(`onCollapseSubmenu`); Tab asks to close every menu (`onClose`). It returns
`focusItem` and `detach`. Escape stays with `attachOverlay`'s stack, so a
submenu shown in an overlay of its own above its menu closes alone.
