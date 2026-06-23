import type { SandboxBackend } from "./backend";
import { BackendUnavailableError } from "./errors";

const registry = new Map<string, SandboxBackend>();

/** Register a backend so it can be resolved by name or auto-selected. */
export function registerBackend(backend: SandboxBackend): void {
	registry.set(backend.name, backend);
}

/** Look up a previously registered backend by name. */
export function getBackend(name: string): SandboxBackend | undefined {
	return registry.get(name);
}

/** All currently registered backends. */
export function listBackends(): SandboxBackend[] {
	return [...registry.values()];
}

/** Package that provides the default backend for each platform. */
const PLATFORM_DEFAULT: Record<string, string> = {
	darwin: "@tupper/container",
	linux: "@tupper/firecracker",
	win32: "@tupper/wsl",
};

/** Lazily imports a backend package by specifier. */
export type BackendLoader = (specifier: string) => Promise<unknown>;

export interface ResolveOptions {
	/** Force a specific backend, by registered name or importable package. */
	backend?: string;
	/**
	 * Loader used to lazily import a backend package. Defaults to `import()`
	 * evaluated inside `@tupper/core`. Callers that own the backend dependency
	 * (e.g. `@tupper/sdk`) should pass their own `(s) => import(s)` so the
	 * specifier resolves against *their* `node_modules` — this is what makes
	 * auto-selection work in symlinked monorepos as well as flat installs.
	 */
	load?: BackendLoader;
}

/**
 * Resolve a usable backend, in order:
 *  1. an explicitly requested backend (registered name or importable package);
 *  2. any already-registered backend that reports availability;
 *  3. the platform default package (lazily imported — it self-registers on load);
 *  4. otherwise throw {@link BackendUnavailableError}.
 *
 * Core never statically imports a backend, so it stays dependency-free and the
 * selection is fully dynamic.
 */
export async function resolveBackend(
	options: ResolveOptions = {},
): Promise<SandboxBackend> {
	const load: BackendLoader =
		options.load ?? ((specifier) => import(specifier));

	if (options.backend) {
		const named = registry.get(options.backend);
		if (named) return named;
		const imported = await tryImport(options.backend, load);
		if (imported) return imported;
		throw new BackendUnavailableError(
			`Backend "${options.backend}" is not available. Import the package that registers it.`,
		);
	}

	for (const backend of registry.values()) {
		if (await backend.isAvailable()) return backend;
	}

	const pkg = PLATFORM_DEFAULT[process.platform];
	if (pkg) {
		const imported = await tryImport(pkg, load);
		if (imported && (await imported.isAvailable())) return imported;
	}

	throw new BackendUnavailableError(
		`No available sandbox backend for platform "${process.platform}". ` +
			`Install and import a backend (e.g. ${pkg ?? "@tupper/container"}).`,
	);
}

/**
 * Dynamically import a backend package; backends self-register on import, so we
 * return whichever backend was newly added. Returns undefined if the package
 * cannot be loaded or registered nothing.
 */
async function tryImport(
	specifier: string,
	load: BackendLoader,
): Promise<SandboxBackend | undefined> {
	const before = new Set(registry.keys());
	try {
		await load(specifier);
	} catch {
		return undefined;
	}
	for (const [name, backend] of registry) {
		if (!before.has(name)) return backend;
	}
	return undefined;
}
