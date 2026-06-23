/** Result of running a command inside a sandbox. */
export interface ExecResult {
	stdout: string;
	stderr: string;
	/** Process exit code, or null if the process was killed by a signal. */
	exitCode: number | null;
	/** Signal that terminated the process, if any. */
	signal?: string | null;
	/** True if the command was killed because it exceeded its timeout. */
	timedOut?: boolean;
}

/** Options for running a command inside a sandbox. */
export interface ExecOptions {
	/** Working directory inside the sandbox. */
	cwd?: string;
	/** Environment variables to set for the command. */
	env?: Record<string, string>;
	/** User to run the command as. */
	user?: string;
	/** Kill the command after this many milliseconds. */
	timeoutMs?: number;
	/** Data to write to the command's stdin. */
	stdin?: string | Uint8Array;
	/** Called with chunks of stdout as they arrive. */
	onStdout?: (chunk: string) => void;
	/** Called with chunks of stderr as they arrive. */
	onStderr?: (chunk: string) => void;
	/** Abort the command when this signal fires. */
	signal?: AbortSignal;
}

/** A file to write into the sandbox. */
export interface FileWrite {
	path: string;
	data: Uint8Array | string;
}

/** Outcome of writing a single file; `error` is null on success. */
export interface FileWriteResult {
	path: string;
	error: string | null;
}

/** Outcome of reading a single file; `content` is null on error. */
export interface FileReadResult {
	path: string;
	content: Uint8Array | null;
	error: string | null;
}

/** A host↔sandbox bind mount. */
export interface Mount {
	source: string;
	target: string;
	readonly?: boolean;
}

/**
 * Per-backend create options, keyed by backend name. Backend packages augment
 * this interface via declaration merging so {@link CreateSandboxOptions.backendOptions}
 * gains autocomplete for the backends you've imported:
 *
 * ```ts
 * declare module "@tupper/core" {
 *   interface BackendOptionsByName {
 *     "apple-container": { noDns?: boolean };
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: declaration-merging extension point; backends augment it
export interface BackendOptionsByName {}

/**
 * Backend-specific create options. Resolves to the union of every imported
 * backend's options (via {@link BackendOptionsByName}); the open
 * `Record<string, unknown>` member keeps it permissive for backends that haven't
 * declared their options and for runtime-validated (Zod) input.
 */
export type BackendOptions =
	| BackendOptionsByName[keyof BackendOptionsByName]
	| Record<string, unknown>;

/** Options for creating a new sandbox. */
export interface CreateSandboxOptions {
	/** OCI image reference. The backend supplies a default when omitted. */
	image?: string;
	/** Optional human-friendly name. */
	name?: string;
	/** Default working directory for commands. */
	cwd?: string;
	/** Environment variables available to all commands. */
	env?: Record<string, string>;
	/** Number of CPUs to allocate. */
	cpus?: number;
	/** Memory limit, e.g. "1g" or "512m". */
	memory?: string;
	/** Ports to publish from the sandbox to the host. */
	ports?: number[];
	/** Bind mounts. */
	mounts?: Mount[];
	/** Labels/metadata attached to the sandbox. */
	labels?: Record<string, string>;
	/** Auto-kill the sandbox after this many milliseconds of inactivity. */
	timeoutMs?: number;
	/**
	 * Backend-specific create options that don't map onto the shared fields above
	 * — e.g. the container backend's `noDns`. Typed per backend via
	 * {@link BackendOptionsByName} (backends augment it); each backend reads the
	 * keys it understands and ignores the rest.
	 */
	backendOptions?: BackendOptions;
}

export type SandboxStatus = "running" | "stopped" | "unknown";

/** A published port mapping. */
export interface PortMapping {
	container: number;
	host: number;
}

/** Metadata describing a sandbox instance. */
export interface SandboxInfo {
	id: string;
	/** Name of the backend that owns this sandbox, e.g. "apple-container". */
	backend: string;
	image?: string;
	status: SandboxStatus;
	/** ISO-8601 creation timestamp. */
	createdAt?: string;
	labels?: Record<string, string>;
	ports?: PortMapping[];
}
