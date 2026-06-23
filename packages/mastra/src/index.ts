import { randomUUID } from "node:crypto";
import type { SandboxInfo, WorkspaceSandbox } from "@mastra/core/workspace";
import { Sandbox, type SandboxOpts } from "@tupper/sdk";

// Derive the option/result/status types from the interface — @mastra/core's
// `./workspace` entry exports `WorkspaceSandbox`/`SandboxInfo` but not these
// directly, and deriving keeps us resilient to the (alpha) API's churn.
type ExecuteFn = NonNullable<WorkspaceSandbox["executeCommand"]>;
type ExecuteOptions = NonNullable<Parameters<ExecuteFn>[2]>;
type CommandResult = Awaited<ReturnType<ExecuteFn>>;
type ProviderStatus = WorkspaceSandbox["status"];

const PROVIDER = "tupper";

/**
 * A Mastra {@link WorkspaceSandbox} backed by a Tupper sandbox. Pass an instance
 * to `new Workspace({ sandbox })`; Mastra calls `start()` during init and
 * `destroy()` during cleanup.
 */
export class TupperSandbox implements WorkspaceSandbox {
	readonly id = randomUUID();
	readonly name = "Tupper";
	readonly provider = PROVIDER;
	status: ProviderStatus = "pending";

	private box?: Sandbox;
	private createdAt = new Date();

	constructor(private readonly options: SandboxOpts = {}) {}

	/** Wrap an already-created Tupper {@link Sandbox} (skips `start()` creation). */
	static wrap(sandbox: Sandbox): TupperSandbox {
		const instance = new TupperSandbox();
		instance.box = sandbox;
		instance.status = "running";
		return instance;
	}

	async start(): Promise<void> {
		if (this.box) return;
		this.status = "starting";
		try {
			this.box = await Sandbox.create(this.options);
			this.createdAt = new Date();
			this.status = "running";
		} catch (err) {
			this.status = "error";
			throw err;
		}
	}

	async destroy(): Promise<void> {
		try {
			await this.box?.kill();
		} finally {
			this.box = undefined;
			this.status = "destroyed";
		}
	}

	isReady(): boolean {
		return this.status === "running";
	}

	getInstructions(): string {
		return "Runs shell commands in an isolated Tupper sandbox (Linux). Filesystem changes persist for the sandbox's lifetime and are discarded when it is destroyed.";
	}

	async executeCommand(
		command: string,
		args: string[] = [],
		options: ExecuteOptions = {},
	): Promise<CommandResult> {
		const box = this.requireBox();
		const full =
			args.length > 0
				? `${command} ${args.map(shellQuote).join(" ")}`
				: command;
		const startedAt = Date.now();
		const r = await box.commands.run(full, {
			timeoutMs: options.timeout,
			cwd: options.cwd,
			env: cleanEnv(options.env),
			onStdout: options.onStdout,
			onStderr: options.onStderr,
			signal: options.abortSignal,
		});
		return {
			command,
			args,
			success: r.exitCode === 0,
			exitCode: r.exitCode ?? -1,
			stdout: r.stdout,
			stderr: r.stderr,
			executionTimeMs: Date.now() - startedAt,
			timedOut: r.timedOut ?? false,
		} satisfies CommandResult;
	}

	getInfo(): SandboxInfo {
		return {
			id: this.id,
			name: this.name,
			provider: this.provider,
			status: this.status,
			createdAt: this.createdAt,
		} satisfies SandboxInfo;
	}

	private requireBox(): Sandbox {
		if (!this.box) {
			throw new Error(
				"Tupper sandbox not started — call start() (or use Workspace) first.",
			);
		}
		return this.box;
	}
}

function cleanEnv(
	env: ExecuteOptions["env"],
): Record<string, string> | undefined {
	if (!env) return undefined;
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(env)) {
		if (typeof v === "string") out[k] = v;
	}
	return out;
}

function shellQuote(s: string): string {
	return `'${s.replace(/'/g, `'\\''`)}'`;
}
