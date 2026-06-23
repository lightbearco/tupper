import type {
	CreateSandboxOptions,
	ExecOptions,
	ExecResult,
	FileReadResult,
	FileWrite,
	FileWriteResult,
	SandboxInfo,
} from "./types";

/**
 * A pluggable sandbox backend — a runtime that can provision and manage
 * sandboxes (Apple Containers on macOS, Firecracker on Linux, WSL on Windows…).
 */
export interface SandboxBackend {
	/** Stable identifier, e.g. "apple-container". */
	readonly name: string;
	/** Whether this backend can be used right now (CLI present, daemon up, …). */
	isAvailable(): Promise<boolean>;
	/** Provision and start a new sandbox. */
	create(options?: CreateSandboxOptions): Promise<SandboxInstance>;
	/** Reconnect to an existing sandbox by id. */
	connect(id: string): Promise<SandboxInstance>;
	/** List sandboxes owned by this backend. */
	list(): Promise<SandboxInfo[]>;
}

/**
 * A single sandbox. `execute` is the universal primitive; file transfer and
 * lifecycle round out the surface needed by deepagents, Mastra and the SDK.
 */
export interface SandboxInstance {
	readonly id: string;
	/** Name of the backend that owns this instance. */
	readonly backend: string;
	/** Run a shell command to completion. */
	execute(command: string, options?: ExecOptions): Promise<ExecResult>;
	/** Upload files; supports partial success (one result per input). */
	writeFiles(files: FileWrite[]): Promise<FileWriteResult[]>;
	/** Download files; supports partial success (one result per input). */
	readFiles(paths: string[]): Promise<FileReadResult[]>;
	/** Current status and metadata. */
	info(): Promise<SandboxInfo>;
	/** (Re)arm the inactivity auto-kill timeout. */
	setTimeout(ms: number): Promise<void>;
	/** Stop and remove the sandbox. */
	kill(): Promise<void>;
	/** Resolve `host:port` for a published container port. */
	getHost(port: number): Promise<string>;
}
