import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    // Generated output, plus config files that sit outside any tsconfig
    // project and so cannot be type-checked by the rules below.
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      ".history/**",
      "**/*.config.{js,mjs,cjs,ts}",
      "**/playwright/.cache/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    // Hooks only exist in the renderer and the apps that consume it.
    ...reactHooks.configs.flat.recommended,
    files: ["packages/react/**", "apps/**"],
  },
  {
    // Core has to stay reusable from any renderer, so it must not reach for
    // one; the tsconfig's DOM-free `lib` covers the browser half of the rule.
    files: ["packages/core/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "@gridkitjs/react"].flatMap(
                (name) => [name, `${name}/*`],
              ),
              message: "core is framework-free, see AGENTS.md",
            },
          ],
        },
      ],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        // Resolves each file to its nearest tsconfig, which is what makes the
        // type-aware rules work across every package in the workspace.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
