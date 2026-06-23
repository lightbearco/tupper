import { spawn } from "node:child_process";

export interface RunOptions {
	cwd?: string;
	env?: Record<string, string>;
	/** Kill the child after this many milliseconds. */
	timeoutMs?: number;
	/** Data to write to the child's stdin. */
	stdin?: string | Uint8Array;
	/** Abort the child when this signal fires. */
	signal?: AbortSignal;
	onStdout?: (chunk: string) => void;
	onStderr?: (chunk: string) => void;
}

export interface RunResult {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	signal: string | null;
	timedOut: boolean;
}

/**
 * Runs a command from an argv array. Injectable so backends can be unit-tested
 * without a live daemon.
 */
export type Runner = (
	cmd: string[],
	options?: RunOptions,
) => Promise<RunResult>;

/**
 * Run a command as an argv array, never via a shell.
 *
 * Because the program and its arguments are passed as an explicit vector, there
 * is no shell to interpret metacharacters in user-supplied values — this is not
 * susceptible to shell injection. Uses `node:child_process` only (no `Bun.*`),
 * so it runs unchanged on Node and Bun.
 */
export const run: Runner = (cmd, options = {}) => {
	const [file, ...args] = cmd;
	if (!file) {
		return Promise.reject(new Error("run() requires a non-empty command"));
	}

	return new Promise<RunResult>((resolve, reject) => {
		const child = spawn(file, args, {
			cwd: options.cwd,
			env: options.env ? { ...process.env, ...options.env } : process.env,
			stdio: ["pipe", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let timedOut = false;
		let settled = false;

		const onAbort = () => child.kill("SIGKILL");
		options.signal?.addEventListener("abort", onAbort, { once: true });

		const timer =
			options.timeoutMs != null
				? setTimeout(() => {
						timedOut = true;
						child.kill("SIGKILL");
					}, options.timeoutMs)
				: undefined;

		const cleanup = () => {
			if (timer) clearTimeout(timer);
			options.signal?.removeEventListener("abort", onAbort);
		};

		child.stdout?.on("data", (d: Buffer) => {
			const s = d.toString();
			stdout += s;
			options.onStdout?.(s);
		});
		child.stderr?.on("data", (d: Buffer) => {
			const s = d.toString();
			stderr += s;
			options.onStderr?.(s);
		});

		child.on("error", (err) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(err);
		});

		child.on("close", (code, signal) => {
			if (settled) return;
			settled = true;
			cleanup();
			resolve({
				stdout,
				stderr,
				exitCode: code,
				signal: signal ?? null,
				timedOut,
			});
		});

		if (options.stdin != null) {
			child.stdin?.end(options.stdin);
		} else {
			child.stdin?.end();
		}
	});
};
