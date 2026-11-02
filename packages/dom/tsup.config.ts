import { defineConfig } from "tsup";

// No `"use client"` banner, unlike `@gridkitjs/react`: nothing here is a
// component, and nothing touches the DOM until a behaviour is attached.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});
