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
    ],
  },
  ...nextVitals,
  ...nextTypescript,
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
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
    },
  },
];
