import type { FileWrite, SandboxInstance } from "@tupper/core";

/** A single entry returned by {@link FileSystem.list}. */
export interface FileEntry {
	name: string;
}

/** Filesystem surface, mirroring E2B's `sandbox.files`. */
export class FileSystem {
	constructor(private readonly instance: SandboxInstance) {}

	/** Read a file as UTF-8 text. */
	async read(path: string): Promise<string> {
		return new TextDecoder().decode(await this.readBytes(path));
	}

	/** Read a file as raw bytes. */
	async readBytes(path: string): Promise<Uint8Array> {
		const [res] = await this.instance.readFiles([path]);
		if (!res || res.error || !res.content) {
			throw new Error(`Failed to read ${path}: ${res?.error ?? "not found"}`);
		}
		return res.content;
	}

	/** Write a single file. */
	async write(path: string, data: string | Uint8Array): Promise<void>;
	/** Write multiple files in one batch. */
	async write(files: FileWrite[]): Promise<void>;
	async write(a: string | FileWrite[], b?: string | Uint8Array): Promise<void> {
		const files: FileWrite[] =
			typeof a === "string" ? [{ path: a, data: b ?? "" }] : a;
		const failed = (await this.instance.writeFiles(files)).filter(
			(r) => r.error,
		);
		if (failed.length) {
			throw new Error(
				`Failed to write: ${failed.map((f) => `${f.path} (${f.error})`).join(", ")}`,
			);
		}
	}

	/** List the entries of a directory (names only). */
	async list(path: string): Promise<FileEntry[]> {
		const r = await this.instance.execute(`ls -1A ${quote(path)}`);
		if (r.exitCode !== 0)
			throw new Error(`Failed to list ${path}: ${r.stderr.trim()}`);
		return r.stdout
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((name) => ({ name }));
	}

	/** Remove a file or directory (recursively). */
	async remove(path: string): Promise<void> {
		const r = await this.instance.execute(`rm -rf ${quote(path)}`);
		if (r.exitCode !== 0)
			throw new Error(`Failed to remove ${path}: ${r.stderr.trim()}`);
	}

	/** Rename/move a path. */
	async rename(from: string, to: string): Promise<void> {
		const r = await this.instance.execute(`mv ${quote(from)} ${quote(to)}`);
		if (r.exitCode !== 0)
			throw new Error(`Failed to rename ${from}: ${r.stderr.trim()}`);
	}

	/** Whether a path exists. */
	async exists(path: string): Promise<boolean> {
		return (
			(await this.instance.execute(`test -e ${quote(path)}`)).exitCode === 0
		);
	}
}

/** POSIX single-quote a string for safe interpolation into an in-sandbox shell. */
function quote(s: string): string {
	return `'${s.replace(/'/g, `'\\''`)}'`;
}
