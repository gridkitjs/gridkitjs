import { defineConfig } from "tsup";

// tsup leaves every `dependencies` entry external, so `fflate` is resolved
// from the consumer's install rather than copied into `dist`.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});
