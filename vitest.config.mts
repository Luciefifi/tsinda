import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: loadEnv(mode, process.cwd(), ""),
    globalSetup: ["./src/test/global-setup.ts"],
    setupFiles: ["./src/test/setup.ts"],
    fileParallelism: false,
  },
}));
