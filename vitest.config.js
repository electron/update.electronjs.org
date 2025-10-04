const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    globals: true,
    environment: "node",
    testMatch: ["test/**/*.test.js"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", "test/**", "bin/**", "example/**"],
    },
    setupFiles: [],
    testTimeout: 10000,
  },
});
