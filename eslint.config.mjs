import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";


export default [
  {
    ignores: [
      "public/sw.js",
      "public/fallback-*.js",
      "public/worker-*.js",
      "public/workbox-*.js",
      "lint-report.json",
      "eslint-report.json",
      "playwright.config.ts",
      "e2e/",
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      security,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/unsupported-syntax": "off",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "warn",
      "security/detect-unsafe-regex": "warn",
    },
  },
];
