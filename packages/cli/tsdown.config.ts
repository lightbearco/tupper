import { defineConfig } from "tsdown";

// Bundles the library entry (src/index.ts) and the `tupper` bin (src/cli.ts).
// Dependencies and node: builtins stay external.
export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
});
