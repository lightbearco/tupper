import { expect, test } from "bun:test";
import type { Sandbox } from "@tupper/sdk";
import { TupperSandbox } from "../src/index";

function fakeSandbox(): Sandbox {
	return {
		id: "sbx-1",
		commands: {
			run: async (command: string) => ({
				stdout: `out:${command}`,
				stderr: "err",
				exitCode: 0,
				signal: null,
				timedOut: false,
			}),
		},
		files: {
			write: async () => {},
			readBytes: async (path: string) => {
				if (path === "/missing") throw new Error("not found");
				return new TextEncoder().encode(`data:${path}`);
			},
		},
		kill: async () => {},
	} as unknown as Sandbox;
}

test("execute maps the SDK result to a deepagents ExecuteResponse", async () => {
	const sb = new TupperSandbox(fakeSandbox());
	expect(sb.id).toBe("sbx-1");
	expect(await sb.execute("ls")).toEqual({
		output: "out:lserr",
		exitCode: 0,
		truncated: false,
	});
});

test("uploadFiles / downloadFiles report per-file results", async () => {
	const sb = new TupperSandbox(fakeSandbox());

	expect(
		await sb.uploadFiles([["/a.txt", new TextEncoder().encode("hi")]]),
	).toEqual([{ path: "/a.txt", error: null }]);

	const down = await sb.downloadFiles(["/a.txt", "/missing"]);
	expect(down[0]?.error).toBeNull();
	expect(new TextDecoder().decode(down[0]?.content ?? new Uint8Array())).toBe(
		"data:/a.txt",
	);
	expect(down[1]?.content).toBeNull();
	expect(down[1]?.error).toBe("file_not_found");
});
