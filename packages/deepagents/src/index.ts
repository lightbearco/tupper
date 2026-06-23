import { Sandbox, type SandboxOpts } from "@tupper/sdk";
import {
	BaseSandbox,
	type ExecuteResponse,
	type FileDownloadResponse,
	type FileOperationError,
	type FileUploadResponse,
} from "deepagents";

/**
 * A deepagents sandbox backend backed by a Tupper {@link Sandbox}.
 *
 * Extends deepagents' {@link BaseSandbox}, which builds ls / read / grep / glob /
 * write / edit on top of the three primitives implemented here. Pass an instance
 * to `createDeepAgent({ backend })`.
 */
export class TupperSandbox extends BaseSandbox {
	readonly id: string;

	constructor(private readonly sandbox: Sandbox) {
		super();
		this.id = sandbox.id;
	}

	/** Create a Tupper-backed deepagents sandbox. */
	static async create(options?: SandboxOpts): Promise<TupperSandbox> {
		return new TupperSandbox(await Sandbox.create(options));
	}

	async execute(command: string): Promise<ExecuteResponse> {
		const r = await this.sandbox.commands.run(command);
		return {
			output: r.stdout + r.stderr,
			exitCode: r.exitCode,
			truncated: false,
		};
	}

	async uploadFiles(
		files: Array<[string, Uint8Array]>,
	): Promise<FileUploadResponse[]> {
		const results: FileUploadResponse[] = [];
		for (const [path, content] of files) {
			try {
				await this.sandbox.files.write(path, content);
				results.push({ path, error: null });
			} catch (err) {
				results.push({ path, error: toFileError(err, "invalid_path") });
			}
		}
		return results;
	}

	async downloadFiles(paths: string[]): Promise<FileDownloadResponse[]> {
		const results: FileDownloadResponse[] = [];
		for (const path of paths) {
			try {
				const content = await this.sandbox.files.readBytes(path);
				results.push({ path, content, error: null });
			} catch (err) {
				results.push({
					path,
					content: null,
					error: toFileError(err, "file_not_found"),
				});
			}
		}
		return results;
	}

	/** Stop and remove the underlying sandbox. */
	async close(): Promise<void> {
		await this.sandbox.kill();
	}
}

/** Map an arbitrary error onto deepagents' fixed FileOperationError codes. */
function toFileError(
	err: unknown,
	fallback: FileOperationError,
): FileOperationError {
	const message = (
		err instanceof Error ? err.message : String(err)
	).toLowerCase();
	if (message.includes("not found") || message.includes("no such"))
		return "file_not_found";
	if (message.includes("permission") || message.includes("denied"))
		return "permission_denied";
	if (message.includes("directory")) return "is_directory";
	return fallback;
}
