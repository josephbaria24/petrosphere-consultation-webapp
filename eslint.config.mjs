import tseslint from "typescript-eslint";

export default [
  ...compat.config({ extends: ["next", "next/core-web-vitals"] }),

  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
  },
];
