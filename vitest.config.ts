import { availableParallelism } from "node:os";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // At most one worker per CPU across both projects. More share the CPUs, and a test's 5 s limit
    // then counts the other workers' time too: on the one-CPU test VM a 0.5 s app-flow test timed out.
    maxWorkers: availableParallelism(),
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
