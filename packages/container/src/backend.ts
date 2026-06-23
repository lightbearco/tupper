import type {
	CreateSandboxOptions,
	SandboxBackend,
	SandboxInfo,
	SandboxInstance,
} from "@tupper/core";
import { SandboxNotFoundError } from "@tupper/core";
import { type ContainerCli, makeCli } from "./cli";
import { parseList } from "./inspect";
import { ContainerInstance } from "./instance";

const BACKEND_NAME = "apple-container";
const DEFAULT_IMAGE = "docker.io/library/alpine:latest";

/** Per-create options for the Apple Containers backend (`backendOptions`). */
export interface ContainerCreateOptions {
	/** Disable DNS configuration in the sandbox (`container run --no-dns`). */
	noDns?: boolean;
}

// Type `backendOptions` for this backend (see @tupper/core's BackendOptionsByName).
declare module "@tupper/core" {
	interface BackendOptionsByName {
		"apple-container": ContainerCreateOptions;
	}
}

export class ContainerBackend implements SandboxBackend {
	readonly name = BACKEND_NAME;
	private readonly cli: ContainerCli;

	constructor(options: { cli?: ContainerCli } = {}) {
		this.cli = options.cli ?? makeCli();
	}

	async isAvailable(): Promise<boolean> {
		try {
			const r = await this.cli(["system", "status"]);
			return r.exitCode === 0;
		} catch {
			return false;
		}
	}

	async create(options: CreateSandboxOptions = {}): Promise<SandboxInstance> {
		const image = options.image ?? DEFAULT_IMAGE;
		const backendOptions = (options.backendOptions ?? {}) as Record<
			string,
			unknown
		>;
		const args = ["run", "--detach"];
		if (options.name) args.push("--name", options.name);
		if (options.cwd) args.push("--workdir", options.cwd);
		if (options.cpus != null) args.push("--cpus", String(options.cpus));
		if (options.memory) args.push("--memory", options.memory);
		if (backendOptions.noDns === true) args.push("--no-dns");
		for (const [k, v] of Object.entries(options.env ?? {}))
			args.push("--env", `${k}=${v}`);
		for (const port of options.ports ?? [])
			args.push("--publish", `${port}:${port}`);
		for (const m of options.mounts ?? []) {
			args.push(
				"--volume",
				m.readonly ? `${m.source}:${m.target}:ro` : `${m.source}:${m.target}`,
			);
		}
		for (const [k, v] of Object.entries(options.labels ?? {}))
			args.push("--label", `${k}=${v}`);
		args.push(image, "sleep", "infinity");

		const r = await this.cli(args);
		if (r.exitCode !== 0) {
			throw new Error(
				`Failed to create sandbox: ${r.stderr.trim() || r.stdout.trim()}`,
			);
		}
		const id = r.stdout.trim().split("\n").filter(Boolean).pop()?.trim();
		if (!id) throw new Error("`container run` did not return a container id");

		return new ContainerInstance(id, this.cli, {
			image,
			timeoutMs: options.timeoutMs,
		});
	}

	async connect(id: string): Promise<SandboxInstance> {
		const r = await this.cli(["inspect", id]);
		if (r.exitCode !== 0) {
			throw new SandboxNotFoundError(`Sandbox "${id}" not found`);
		}
		return new ContainerInstance(id, this.cli);
	}

	async list(): Promise<SandboxInfo[]> {
		const r = await this.cli(["list", "--all", "--format", "json"]);
		if (r.exitCode !== 0) return [];
		return parseList(r.stdout, this.name);
	}
}
