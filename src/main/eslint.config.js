import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import ipcSerializationCheck from "../../rules/ipc-serialization-check.js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      custom: {
        rules: {
          "ipc-serialization-check": ipcSerializationCheck,
        },
      },
    },
    rules: {
      "custom/ipc-serialization-check": ["error", { tsconfigPath: "../../tsconfig.json" }],
    },
  },
  { ignores: ["dist/**/*"] },
];
