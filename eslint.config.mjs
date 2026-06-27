import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // SonarJS rules — prevent code quality issues caught by SonarCloud
  // SonarJS rules and general JS rules — apply to all source files
  {
    plugins: { sonarjs },
    rules: {
      // Complexity — enforced as errors to block PRs that exceed the threshold
      "sonarjs/cognitive-complexity": ["error", 15],
      "sonarjs/no-nested-functions": "warn",

      // Duplicated code
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-duplicated-branches": "error",

      // Bug risks
      "sonarjs/no-all-duplicated-branches": "error",
      "sonarjs/no-unused-collection": "error",
      "sonarjs/no-use-of-empty-return-value": "error",

      // Code smell
      "sonarjs/prefer-immediate-return": "warn",
      "sonarjs/no-inverted-boolean-check": "error",
      "sonarjs/no-redundant-boolean": "error",

      // React
      "react/no-array-index-key": "error",

      // Ignore underscore-prefixed vars and rest-sibling destructured vars
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "ignoreRestSiblings": true,
      }],

      // React Hook Form's watch() API is not compatible with React Compiler memoization.
      // This is a known limitation documented at https://react-hook-form.com/. Disabling until
      // React Hook Form ships a Compiler-compatible version or we migrate to an alternative.
      "react-hooks/incompatible-library": "off",

      // The React Compiler's set-state-in-effect rule flags valid async data-fetching patterns
      // (e.g. useEffect(() => { void loadData() }, [loadData])) where state is set only after
      // awaiting a fetch — not synchronously. Disabling because the static analysis cannot
      // distinguish sync vs async setState in higher-order calls, producing widespread false positives.
      // Genuine synchronous-setState-in-effect issues should be caught in code review.
      "react-hooks/set-state-in-effect": "off",

      // Number methods and global-scope functions — always use the Number.* / globalThis variants
      "no-restricted-globals": [
        "error",
        { "name": "parseInt",   "message": "Use Number.parseInt instead." },
        { "name": "parseFloat", "message": "Use Number.parseFloat instead." },
        { "name": "isNaN",      "message": "Use Number.isNaN instead." },
        { "name": "isFinite",   "message": "Use Number.isFinite instead." },
        { "name": "window",     "message": "Use globalThis instead of window for cross-environment portability." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "prisma/migrations/**",
    "scripts/**",
    // Plain JS config files — not TypeScript, skip typed-linting rules
    "deployment.config.js",
    "*.config.js",
  ]),
]);

export default eslintConfig;
