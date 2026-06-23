import { beforeAll, expect, spyOn, test } from "bun:test";
import { registerBackend } from "@tupper/core";
import { fakeBackend } from "@tupper/core/testing";
import { makeProgram } from "../src/program";

const BACKEND = "fake-cli";

beforeAll(() => {
	registerBackend(fakeBackend({ name: BACKEND }));
});

/** Run the CLI with user-style argv and capture console.log lines. */
async function run(...argv: string[]): Promise<string[]> {
	const lines: string[] = [];
	const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
		lines.push(args.join(" "));
	});
	try {
		await makeProgram().parseAsync(argv, { from: "user" });
	} finally {
		spy.mockRestore();
	}
	return lines;
}

test("create prints the sandbox id", async () => {
	const lines = await run("create", "alpine", "--backend", BACKEND);
	expect(lines).toEqual(["sbx-1"]);
});

test("list prints a row per sandbox", async () => {
	const lines = await run("list", "--backend", BACKEND);
	expect(lines[0]).toContain("sbx-1");
	expect(lines[0]).toContain("running");
});

test("info prints JSON", async () => {
	const lines = await run("info", "sbx-1", "--backend", BACKEND);
	expect(JSON.parse(lines.join("\n")).id).toBe("sbx-1");
});

test("run writes command output to stdout", async () => {
	const chunks: string[] = [];
	const spy = spyOn(process.stdout, "write").mockImplementation((chunk) => {
		chunks.push(String(chunk));
		return true;
	});
	try {
		await makeProgram().parseAsync(
			["run", "sbx-1", "echo", "hi", "--backend", BACKEND],
			{ from: "user" },
		);
	} finally {
		spy.mockRestore();
	}
	expect(chunks.join("")).toBe("ran:echo hi");
});
