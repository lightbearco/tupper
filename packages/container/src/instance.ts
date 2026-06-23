import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import {
	asRecord,
	type ExecOptions,
	type ExecResult,
	type FileReadResult,
	type FileWrite,
	type FileWriteResult,
	type SandboxInfo,
	type SandboxInstance,
} from "@tupper/core";
import type { ContainerCli } from "./cli";
import { extractAddress, extractImage, extractStatus } from "./inspect";

const BACKEND_NAME = "apple-container";

export class ContainerInstance implements SandboxInstance {
	readonly backend = BACKEND_NAME;

	private idleTimer?: ReturnType<typeof setTimeout>;
	private timeoutMs?: number;
	private readonly image?: string;

	constructor(
		readonly id: string,
		private readonly cli: ContainerCli,
		options: { image?: string; timeoutMs?: number } = {},
	) {
		this.image = options.image;
		if (options.timeoutMs != null) {
			this.timeoutMs = options.timeoutMs;
			this.armIdleTimer();
		}
	}

	async execute(
		command: string,
		options: ExecOptions = {},
	): Promise<ExecResult> {
		this.touch();
		const args = ["exec"];
		if (options.cwd) args.push("--workdir", options.cwd);
		if (options.user) args.push("--user", options.user);
		for (const [k, v] of Object.entries(options.env ?? {}))
			args.push("--env", `${k}=${v}`);
		args.push(this.id, "sh", "-c", command);

		const r = await this.cli(args, {
			timeoutMs: options.timeoutMs,
			stdin: options.stdin,
			signal: options.signal,
			onStdout: options.onStdout,
			onStderr: options.onStderr,
		});
		return {
			stdout: r.stdout,
			stderr: r.stderr,
			exitCode: r.exitCode,
			signal: r.signal,
			timedOut: r.timedOut,
		};
	}

	async writeFiles(files: FileWrite[]): Promise<FileWriteResult[]> {
		const results: FileWriteResult[] = [];
		const dir = await mkdtemp(join(tmpdir(), "tupper-"));
		try {
			for (const f of files) {
				try {
					const tmp = join(dir, "upload");
					const data =
						typeof f.data === "string"
							? new TextEncoder().encode(f.data)
							: f.data;
					await writeFile(tmp, data);

					const parent = posix.dirname(f.path);
					if (parent && parent !== "." && parent !== "/") {
						await this.cli(["exec", this.id, "mkdir", "-p", parent]);
					}
					const cp = await this.cli(["cp", tmp, `${this.id}:${f.path}`]);
					results.push({
						path: f.path,
						error: cp.exitCode === 0 ? null : cp.stderr.trim() || "copy failed",
					});
				} catch (err) {
					results.push({ path: f.path, error: errorMessage(err) });
				}
			}
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
		return results;
	}

	async readFiles(paths: string[]): Promise<FileReadResult[]> {
		const results: FileReadResult[] = [];
		const dir = await mkdtemp(join(tmpdir(), "tupper-"));
		try {
			for (const p of paths) {
				try {
					const tmp = join(dir, "download");
					const cp = await this.cli(["cp", `${this.id}:${p}`, tmp]);
					if (cp.exitCode !== 0) {
						results.push({
							path: p,
							content: null,
							error: cp.stderr.trim() || "copy failed",
						});
						continue;
					}
					const content = await readFile(tmp);
					results.push({
						path: p,
						content: new Uint8Array(content),
						error: null,
					});
				} catch (err) {
					results.push({ path: p, content: null, error: errorMessage(err) });
				}
			}
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
		return results;
	}

	async info(): Promise<SandboxInfo> {
		const base: SandboxInfo = {
			id: this.id,
			backend: this.backend,
			image: this.image,
			status: "unknown",
		};
		const r = await this.cli(["inspect", this.id]);
		if (r.exitCode !== 0) return base;
		try {
			const data: unknown = JSON.parse(r.stdout);
			const item = asRecord(Array.isArray(data) ? data[0] : data);
			return {
				...base,
				status: extractStatus(item),
				image: this.image ?? extractImage(item),
			};
		} catch {
			return base;
		}
	}

	async setTimeout(ms: number): Promise<void> {
		this.timeoutMs = ms;
		this.armIdleTimer();
	}

	async kill(): Promise<void> {
		this.clearIdleTimer();
		await this.cli(["stop", this.id]);
		const rmResult = await this.cli(["rm", this.id]);
		if (rmResult.exitCode !== 0) {
			await this.cli(["rm", "--force", this.id]);
		}
	}

	async getHost(port: number): Promise<string> {
		const r = await this.cli(["inspect", this.id]);
		if (r.exitCode === 0) {
			try {
				const data: unknown = JSON.parse(r.stdout);
				const item = asRecord(Array.isArray(data) ? data[0] : data);
				const ip = extractAddress(item);
				if (ip) return `${ip}:${port}`;
			} catch {
				// fall through to localhost
			}
		}
		return `127.0.0.1:${port}`;
	}

	private touch(): void {
		if (this.timeoutMs != null) this.armIdleTimer();
	}

	private armIdleTimer(): void {
		this.clearIdleTimer();
		if (this.timeoutMs != null) {
			this.idleTimer = setTimeout(() => {
				void this.kill();
			}, this.timeoutMs);
			this.idleTimer.unref?.();
		}
	}

	private clearIdleTimer(): void {
		if (this.idleTimer) {
			clearTimeout(this.idleTimer);
			this.idleTimer = undefined;
		}
	}
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}
