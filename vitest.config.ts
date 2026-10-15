import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts"],
        },
      },
      {
        plugins: [svelte(), svelteTesting()],
        test: {
          name: "component",
          environment: "jsdom",
          include: ["tests/component/**/*.test.ts"],
          setupFiles: ["tests/component/setup.ts"],
        },
      },
    ],
    benchmark: { include: ["tests/bench/**/*.bench.ts"] },
  },
});
