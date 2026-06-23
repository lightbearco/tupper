import { z } from "zod";

/**
 * Zod schemas for validating untrusted input (HTTP bodies, MCP tool args, CLI
 * flags) against the core option types. Each schema covers the JSON-serializable
 * fields of the corresponding type in `./types`; its inferred type is assignable
 * to that type, so parsed data can be passed straight to a backend or the SDK.
 */

/** Validates a {@link import("./types").Mount}. */
export const MountSchema = z.object({
	source: z.string(),
	target: z.string(),
	readonly: z.boolean().optional(),
});

/** Validates the wire-safe fields of {@link import("./types").CreateSandboxOptions}. */
export const CreateSandboxOptionsSchema = z.object({
	image: z.string().optional(),
	name: z.string().optional(),
	cwd: z.string().optional(),
	env: z.record(z.string(), z.string()).optional(),
	cpus: z.number().int().positive().optional(),
	memory: z.string().optional(),
	ports: z.array(z.number().int()).optional(),
	mounts: z.array(MountSchema).optional(),
	labels: z.record(z.string(), z.string()).optional(),
	timeoutMs: z.number().int().nonnegative().optional(),
	backendOptions: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Validates the JSON-serializable subset of {@link import("./types").ExecOptions}
 * (stdin, output callbacks and `AbortSignal` are runtime-only and omitted).
 */
export const ExecOptionsSchema = z.object({
	cwd: z.string().optional(),
	env: z.record(z.string(), z.string()).optional(),
	user: z.string().optional(),
	timeoutMs: z.number().int().nonnegative().optional(),
});
