import {
	type CreateSandboxOptions,
	resolveBackend,
	type SandboxBackend,
	type SandboxInfo,
	type SandboxInstance,
} from "@tupper/core";
import { Commands } from "./commands";
import { FileSystem } from "./filesystem";

/** Options for {@link Sandbox.create}. */
export interface SandboxOpts extends CreateSandboxOptions {
	/** Force a specific backend by name. Defaults to platform auto-detection. */
	backend?: string;
}

/** Options for backend selection on connect/list/kill. */
export interface ConnectOpts {
	backend?: string;
}

/**
 * Lazily import a backend package from the SDK's own module context. Because
 * this `import()` lives in `@tupper/sdk`, specifiers resolve against the SDK's
 * `node_modules` (where the backend is an optional peer dependency), so
 * auto-selection works in symlinked monorepos as well as flat installs.
 */
const load = (specifier: string): Promise<unknown> => import(specifier);

/**
 * Ergonomic, E2B-style handle to a sandbox. Backed by a {@link SandboxInstance}
 * resolved from whichever backend is available (Apple Containers today).
 */
export class Sandbox {
	readonly commands: Commands;
	readonly files: FileSystem;

	private constructor(private readonly instance: SandboxInstance) {
		this.commands = new Commands(instance);
		this.files = new FileSystem(instance);
	}

	get id(): string {
		return this.instance.id;
	}

	get backend(): string {
		return this.instance.backend;
	}

	/**
	 * Resolve the backend {@link Sandbox} would use, without creating anything.
	 * Use this to pin a backend once (e.g. at server boot) and then pass its
	 * `name` to subsequent calls so they skip re-resolution.
	 */
	static resolveBackend(options: ConnectOpts = {}): Promise<SandboxBackend> {
		return resolveBackend({ backend: options.backend, load });
	}

	/** Create and start a new sandbox. */
	static async create(options: SandboxOpts = {}): Promise<Sandbox> {
		const backend = await resolveBackend({ backend: options.backend, load });
		return new Sandbox(await backend.create(options));
	}

	/** Reconnect to an existing sandbox by id. */
	static async connect(
		id: string,
		options: ConnectOpts = {},
	): Promise<Sandbox> {
		const backend = await resolveBackend({ backend: options.backend, load });
		return new Sandbox(await backend.connect(id));
	}

	/** List existing sandboxes. */
	static async list(options: ConnectOpts = {}): Promise<SandboxInfo[]> {
		const backend = await resolveBackend({ backend: options.backend, load });
		return backend.list();
	}

	/** Kill a sandbox by id without holding a handle. */
	static async kill(id: string, options: ConnectOpts = {}): Promise<void> {
		const backend = await resolveBackend({ backend: options.backend, load });
		await (await backend.connect(id)).kill();
	}

	/** (Re)arm the inactivity auto-kill timeout. */
	setTimeout(ms: number): Promise<void> {
		return this.instance.setTimeout(ms);
	}

	/** Resolve `host:port` for a published port. */
	getHost(port: number): Promise<string> {
		return this.instance.getHost(port);
	}

	/** Current status and metadata. */
	info(): Promise<SandboxInfo> {
		return this.instance.info();
	}

	/** Stop and remove this sandbox. */
	kill(): Promise<void> {
		return this.instance.kill();
	}
}
