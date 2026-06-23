import { defineConfig } from "tsdown";

// Bundles the main entry and the `@tupper/core/testing` subpath to dist/.
// Dependencies, peerDependencies, and node: builtins are external by default,
// so zod, @tupper/* and node:* imports are preserved rather than inlined.
export default defineConfig({
	entry: ["src/index.ts", "src/testing.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
});
