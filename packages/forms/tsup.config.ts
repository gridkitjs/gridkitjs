import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  // Marks the whole bundle as client code, so it can be imported from a
  // Next.js App Router server component tree without a wrapper.
  banner: { js: '"use client";' },
});
