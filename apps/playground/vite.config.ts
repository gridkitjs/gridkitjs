import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // A build takes only index.html unless every page is listed.
      input: {
        main: path.resolve(import.meta.dirname, "index.html"),
        forms: path.resolve(import.meta.dirname, "forms.html"),
      },
    },
  },
});
