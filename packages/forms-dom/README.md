# @gridkitjs/forms-dom

The browser behaviours GridKit's form inputs need, as framework-free
TypeScript: the text-input pipeline, toggles, auto-grow, Enter navigation and
focus helpers. Built on
[`@gridkitjs/forms-core`](https://www.npmjs.com/package/@gridkitjs/forms-core)
and used by [`@gridkitjs/forms`](https://www.npmjs.com/package/@gridkitjs/forms).

> **Not yet published.** The package is under development in this repository
> and is not on npm yet.

You only need this package to write a forms renderer of your own.
`@gridkitjs/forms` depends on it, so installing that is enough to use the
inputs.

```ts
import { scheduleTimeout } from "@gridkitjs/forms-dom";

const cancel = scheduleTimeout(() => {
  console.log("300ms later");
}, 300);
```

Full documentation: [github.com/gridkitjs/gridkitjs](https://github.com/gridkitjs/gridkitjs#readme)

## License

MIT © Blagoja Blazhevski
