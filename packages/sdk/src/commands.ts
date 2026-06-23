import type { ExecOptions, ExecResult, SandboxInstance } from "@tupper/core";

/** Command-execution surface, mirroring E2B's `sandbox.commands`. */
export class Commands {
	constructor(private readonly instance: SandboxInstance) {}

	/** Run a shell command to completion and return its result. */
	run(command: string, options?: ExecOptions): Promise<ExecResult> {
		return this.instance.execute(command, options);
	}
}
