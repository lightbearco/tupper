import type { SandboxBackend, SandboxInstance } from "./backend";

/**
 * Test helpers shared across packages, exposed at `@tupper/core/testing`.
 * Kept out of the main entry so production bundles never pull them in.
 */

/**
 * A no-op {@link SandboxInstance} for tests. By default `execute` echoes back
 * `ran:<command>` and `readFiles` returns `"hi"`; pass `overrides` to change any
 * member.
 */
export function fakeSandboxInstance(
	overrides: Partial<SandboxInstance> = {},
): SandboxInstance {
	return {
		id: "sbx-1",
		backend: "fake",
		execute: async (command) => ({
			stdout: `ran:${command}`,
			stderr: "",
			exitCode: 0,
			signal: null,
			timedOut: false,
		}),
		writeFiles: async (files) =>
			files.map((f) => ({ path: f.path, error: null })),
		readFiles: async (paths) =>
			paths.map((p) => ({
				path: p,
				content: new TextEncoder().encode("hi"),
				error: null,
			})),
		info: async () => ({
			id: overrides.id ?? "sbx-1",
			backend: overrides.backend ?? "fake",
			status: "running",
		}),
		setTimeout: async () => {},
		kill: async () => {},
		getHost: async (port) => `127.0.0.1:${port}`,
		...overrides,
	};
}

/**
 * A {@link SandboxBackend} whose `create`/`connect` return
 * {@link fakeSandboxInstance}s tagged with the backend's name. Pass `overrides`
 * to set the `name`, toggle `isAvailable`, or capture `create` options.
 */
export function fakeBackend(
	overrides: Partial<SandboxBackend> = {},
): SandboxBackend {
	const name = overrides.name ?? "fake";
	return {
		name,
		isAvailable: async () => true,
		create: async () => fakeSandboxInstance({ backend: name }),
		connect: async (id) => fakeSandboxInstance({ id, backend: name }),
		list: async () => [{ id: "sbx-1", backend: name, status: "running" }],
		...overrides,
	};
}
