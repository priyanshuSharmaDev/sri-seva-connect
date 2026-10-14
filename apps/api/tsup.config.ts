import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "es2023",
  outDir: "dist",
  sourcemap: true,
  clean: true,
  splitting: false,
  noExternal: ["@ssc/contracts", "@ssc/domain"]
});
