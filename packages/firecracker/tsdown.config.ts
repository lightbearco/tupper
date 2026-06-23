import { defineConfig } from "tsdown";

// Bundles src/index.ts -> dist/index.{mjs,cjs} + dist/index.d.{mts,cts}.
// Dependencies, peerDependencies, and node: builtins are external by default,
// so @tupper/* and node:* imports are preserved rather than inlined.
export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
});
