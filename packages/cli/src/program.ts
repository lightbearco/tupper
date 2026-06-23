import { text } from "node:stream/consumers";
import { Sandbox, type SandboxOpts } from "@tupper/sdk";
import { Command, InvalidArgumentError } from "commander";
import { z } from "zod";

/**
 * Build the `tupper` command tree. Returned as a commander {@link Command} so it
 * can be parsed by the bin or driven directly in tests. Every command is a thin
 * wrapper over `@tupper/sdk`'s {@link Sandbox}; option values are validated by
 * the Zod-backed `argParser`s below.
 */
export function makeProgram(): Command {
	const program = new Command();
	program
		.name("tupper")
		.description("Run untrusted code in disposable sandboxes for AI agents.")
		.version("0.1.0");

	program
		.command("create")
		.description("Create and start a sandbox; prints its id")
		.argument("[image]", "OCI image reference")
		.option("--name <name>", "human-friendly name")
		.option("--backend <backend>", "force a specific backend")
		.option("--cpus <n>", "CPUs to allocate", integerArg(1))
		.option("--memory <size>", 'memory limit, e.g. "1g" or "512m"')
		.option("-e, --env <pair...>", "environment variable as KEY=VALUE", envArg)
		.option(
			"--timeout <ms>",
			"inactivity auto-kill timeout in ms",
			integerArg(0),
		)
		.action(async (image: string | undefined, opts: CreateOptions) => {
			const box = await Sandbox.create(toCreateOpts(image, opts));
			console.log(box.id);
		});

	program
		.command("list")
		.alias("ls")
		.description("List sandboxes")
		.option("--backend <backend>", "force a specific backend")
		.action(async (opts: { backend?: string }) => {
			const sandboxes = await Sandbox.list(backendOpt(opts));
			if (sandboxes.length === 0) {
				console.log("No sandboxes.");
				return;
			}
			for (const s of sandboxes) {
				console.log(`${s.id}\t${s.status}\t${s.image ?? ""}`);
			}
		});

	program
		.command("info")
		.description("Show a sandbox's status and metadata")
		.argument("<id>", "sandbox id")
		.option("--backend <backend>", "force a specific backend")
		.action(async (id: string, opts: { backend?: string }) => {
			const box = await Sandbox.connect(id, backendOpt(opts));
			console.log(JSON.stringify(await box.info(), null, 2));
		});

	program
		.command("run")
		.description("Run a command in a sandbox; exits with its exit code")
		.argument("<id>", "sandbox id")
		.argument("<command...>", "command to run")
		.option("--backend <backend>", "force a specific backend")
		.option("--cwd <dir>", "working directory inside the sandbox")
		.option("-e, --env <pair...>", "environment variable as KEY=VALUE", envArg)
		.option(
			"--timeout <ms>",
			"kill the command after this many ms",
			integerArg(0),
		)
		.action(async (id: string, command: string[], opts: RunOptions) => {
			const box = await Sandbox.connect(id, backendOpt(opts));
			const res = await box.commands.run(command.join(" "), {
				cwd: opts.cwd,
				env: opts.env,
				timeoutMs: opts.timeout,
			});
			if (res.stdout) process.stdout.write(res.stdout);
			if (res.stderr) process.stderr.write(res.stderr);
			process.exitCode = res.exitCode ?? 1;
		});

	program
		.command("read")
		.description("Read a file from a sandbox to stdout")
		.argument("<id>", "sandbox id")
		.argument("<path>", "file path inside the sandbox")
		.option("--backend <backend>", "force a specific backend")
		.action(async (id: string, path: string, opts: { backend?: string }) => {
			const box = await Sandbox.connect(id, backendOpt(opts));
			process.stdout.write(await box.files.read(path));
		});

	program
		.command("write")
		.description(
			"Write a file into a sandbox (content from --content or stdin)",
		)
		.argument("<id>", "sandbox id")
		.argument("<path>", "file path inside the sandbox")
		.option("--backend <backend>", "force a specific backend")
		.option("--content <text>", "file content (otherwise read from stdin)")
		.action(
			async (
				id: string,
				path: string,
				opts: { backend?: string; content?: string },
			) => {
				const data = opts.content ?? (await text(process.stdin));
				const box = await Sandbox.connect(id, backendOpt(opts));
				await box.files.write(path, data);
			},
		);

	program
		.command("kill")
		.alias("rm")
		.description("Stop and remove a sandbox")
		.argument("<id>", "sandbox id")
		.option("--backend <backend>", "force a specific backend")
		.action(async (id: string, opts: { backend?: string }) => {
			await Sandbox.kill(id, backendOpt(opts));
		});

	return program;
}

interface CreateOptions {
	name?: string;
	backend?: string;
	cpus?: number;
	memory?: string;
	env?: Record<string, string>;
	timeout?: number;
}

interface RunOptions {
	backend?: string;
	cwd?: string;
	env?: Record<string, string>;
	timeout?: number;
}

/** Translate parsed CLI flags into `SandboxOpts`. */
function toCreateOpts(
	image: string | undefined,
	opts: CreateOptions,
): SandboxOpts {
	return {
		image,
		name: opts.name,
		backend: opts.backend,
		cpus: opts.cpus,
		memory: opts.memory,
		env: opts.env,
		timeoutMs: opts.timeout,
	};
}

/** `{ backend }` when set, else `{}` to auto-select. */
function backendOpt(opts: { backend?: string }): { backend?: string } {
	return opts.backend ? { backend: opts.backend } : {};
}

/** commander `argParser` for an integer option with a minimum, validated by Zod. */
function integerArg(min: number): (value: string) => number {
	const schema = z.coerce.number().int().min(min);
	return (value) => {
		const result = schema.safeParse(value);
		if (!result.success) {
			throw new InvalidArgumentError(`expected an integer >= ${min}`);
		}
		return result.data;
	};
}

const envEntry = z
	.string()
	.regex(/^[^=\s]+=/, "expected KEY=VALUE")
	.describe("KEY=VALUE environment variable");

/** commander `argParser` for repeatable `-e KEY=VALUE`, accumulating a record. */
function envArg(
	value: string,
	previous: Record<string, string> = {},
): Record<string, string> {
	const result = envEntry.safeParse(value);
	if (!result.success) throw new InvalidArgumentError("expected KEY=VALUE");
	const eq = value.indexOf("=");
	return { ...previous, [value.slice(0, eq)]: value.slice(eq + 1) };
}
