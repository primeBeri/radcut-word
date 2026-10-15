import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

// Office globals are reachable only from src/adapters/** (Constitution I, research R14).
const officeGlobals = ["Office", "Word", "OfficeRuntime"].map((name) => ({
  name,
  message: "Only src/adapters/** may use Office.js. Go through a port or an adapter function.",
}));

const coreImportBan = {
  patterns: [
    {
      group: ["**/ui/**", "**/adapters/**", "**/app/**", "**/dev/**"],
      message: "src/core must not depend on ui, adapters, app or dev (ports and adapters).",
    },
    { group: ["svelte", "svelte/*"], message: "src/core is framework-free." },
    {
      group: ["node:*", "jsdom", "@testing-library/*"],
      message: "src/core is pure TypeScript: no DOM or Node helpers.",
    },
  ],
};

export default tseslint.config(
  { ignores: ["dist/", "dist-dev/", "coverage/", "node_modules/", ".tsbuild/", "src/ui/theme/tokens.css", "tests/desktop/**/bin/", "tests/desktop/**/obj/", "tests/desktop/test-results/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "no-restricted-globals": ["error", ...officeGlobals],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        extraFileExtensions: [".svelte"],
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
  {
    files: ["src/adapters/**"],
    rules: { "no-restricted-globals": "off" },
  },
  {
    files: ["src/core/**"],
    rules: {
      "no-restricted-imports": ["error", coreImportBan],
      "no-restricted-globals": [
        "error",
        ...officeGlobals,
        ...["window", "document", "navigator", "localStorage", "sessionStorage"].map((name) => ({
          name,
          message: "src/core is pure TypeScript: no DOM access.",
        })),
      ],
    },
  },
  {
    files: ["src/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/adapters/**"], message: "src/ui talks to the core, never to adapters." },
          ],
        },
      ],
    },
  },
  {
    files: ["scripts/**", "*.config.{js,ts}"],
    languageOptions: { globals: { ...globals.node } },
  },
);
