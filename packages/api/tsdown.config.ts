import { defineConfig } from "tsdown";

// Bundles the library entry (src/index.ts) and the standalone server binary
// (src/server.ts). Dependencies and node: builtins stay external.
export default defineConfig({
	entry: ["src/index.ts", "src/server.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
});
