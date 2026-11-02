---
"@gridkitjs/react": patch
---

The build now starts with a `"use client"` directive, so `@gridkitjs/react`
works when imported from a Next.js App Router server component tree without a
wrapper module of your own.
