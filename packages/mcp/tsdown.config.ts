import { defineConfig } from "tsdown";

// Bundles the library entry (src/index.ts) and the `tupper-mcp` stdio bin
// (src/mcp.ts). Dependencies and node: builtins stay external.
export default defineConfig({
	entry: ["src/index.ts", "src/mcp.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
});
