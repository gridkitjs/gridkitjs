# @gridkitjs/forms-core

The logic behind GridKit's form inputs, as framework-free TypeScript with no
DOM: values and drafts, the events an input fires and their order, parsing,
validation and messages. Used by
[`@gridkitjs/forms-dom`](https://www.npmjs.com/package/@gridkitjs/forms-dom) and
[`@gridkitjs/forms`](https://www.npmjs.com/package/@gridkitjs/forms).

> **Not yet published.** The package is under development in this repository
> and is not on npm yet.

You only need this package to write a forms renderer of your own.
`@gridkitjs/forms` depends on it, so installing that is enough to use the
inputs.

```ts
import { mostSevere } from "@gridkitjs/forms-core";

mostSevere(["info", "error", "warning"]); // "error"
```

Full documentation: [github.com/gridkitjs/gridkitjs](https://github.com/gridkitjs/gridkitjs#readme)

## License

MIT © Blagoja Blazhevski
