import {
	type Runner,
	type RunOptions,
	type RunResult,
	run,
} from "@tupper/core";

/** Default CLI binary used to drive firecracker-containerd. */
export const NERDCTL_BIN = "nerdctl";

export interface NerdctlOptions {
	/** Binary to invoke (default `nerdctl`). */
	bin?: string;
	/** containerd namespace, passed as `--namespace`, if any. */
	namespace?: string;
}

/** Invokes the nerdctl CLI through an injectable runner. */
export type NerdctlCli = (
	args: string[],
	options?: RunOptions,
) => Promise<RunResult>;

/**
 * Build a {@link NerdctlCli} bound to a runner. The default runner shells out to
 * the real `nerdctl` binary; tests pass a fake to avoid a live daemon.
 */
export function makeCli(
	runner: Runner = run,
	options: NerdctlOptions = {},
): NerdctlCli {
	const bin = options.bin ?? NERDCTL_BIN;
	const globals = options.namespace ? ["--namespace", options.namespace] : [];
	return (args, runOptions) => runner([bin, ...globals, ...args], runOptions);
}
