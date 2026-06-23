import {
	type Runner,
	type RunOptions,
	type RunResult,
	run,
} from "@tupper/core";

/** Name of the Apple `container` CLI binary. */
export const CONTAINER_BIN = "container";

/** Invokes the `container` CLI through an injectable runner. */
export type ContainerCli = (
	args: string[],
	options?: RunOptions,
) => Promise<RunResult>;

/**
 * Build a {@link ContainerCli} bound to a runner. The default runner shells out
 * to the real `container` binary; tests pass a fake to avoid a live daemon.
 */
export function makeCli(runner: Runner = run): ContainerCli {
	return (args, options) => runner([CONTAINER_BIN, ...args], options);
}
