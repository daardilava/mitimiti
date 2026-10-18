// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // PGlite ships one huge minified bundle that the import plugin cannot parse.
    files: ["supabase/tests/**"],
    rules: { "import/namespace": "off" },
  },
]);
