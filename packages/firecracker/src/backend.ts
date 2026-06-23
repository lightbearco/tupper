import type {
	CreateSandboxOptions,
	SandboxBackend,
	SandboxInfo,
	SandboxInstance,
} from "@tupper/core";
import { SandboxNotFoundError } from "@tupper/core";
import { makeCli, type NerdctlCli, type NerdctlOptions } from "./cli";
import { parseList } from "./inspect";
import { FirecrackerInstance } from "./instance";

const BACKEND_NAME = "firecracker";
const DEFAULT_IMAGE = "docker.io/library/alpine:latest";
const DEFAULT_RUNTIME = "aws.firecracker";

export interface FirecrackerBackendOptions extends NerdctlOptions {
	/** Pre-built CLI (mainly for tests); overrides `bin`/`namespace`. */
	cli?: NerdctlCli;
	/** containerd runtime handler for Firecracker (default `aws.firecracker`). */
	runtime?: string;
}

/**
 * Runs sandboxes as Firecracker microVMs via firecracker-containerd, driven
 * through the `nerdctl` CLI (`--runtime aws.firecracker`). Mirrors the Apple
 * Containers backend; requires a Linux host with KVM.
 */
export class FirecrackerBackend implements SandboxBackend {
	readonly name = BACKEND_NAME;
	private readonly cli: NerdctlCli;
	private readonly runtime: string;

	constructor(options: FirecrackerBackendOptions = {}) {
		this.cli = options.cli ?? makeCli(undefined, options);
		this.runtime = options.runtime ?? DEFAULT_RUNTIME;
	}

	async isAvailable(): Promise<boolean> {
		try {
			const r = await this.cli(["version"]);
			return r.exitCode === 0;
		} catch {
			return false;
		}
	}

	async create(options: CreateSandboxOptions = {}): Promise<SandboxInstance> {
		const image = options.image ?? DEFAULT_IMAGE;
		const args = ["run", "--detach", "--runtime", this.runtime];
		if (options.name) args.push("--name", options.name);
		if (options.cwd) args.push("--workdir", options.cwd);
		if (options.cpus != null) args.push("--cpus", String(options.cpus));
		if (options.memory) args.push("--memory", options.memory);
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
		if (!id) throw new Error("`nerdctl run` did not return a container id");

		return new FirecrackerInstance(id, this.cli, {
			image,
			timeoutMs: options.timeoutMs,
		});
	}

	async connect(id: string): Promise<SandboxInstance> {
		const r = await this.cli(["inspect", id]);
		if (r.exitCode !== 0) {
			throw new SandboxNotFoundError(`Sandbox "${id}" not found`);
		}
		return new FirecrackerInstance(id, this.cli);
	}

	async list(): Promise<SandboxInfo[]> {
		const r = await this.cli(["ps", "-a", "--format", "{{json .}}"]);
		if (r.exitCode !== 0) return [];
		return parseList(r.stdout, this.name);
	}
}
