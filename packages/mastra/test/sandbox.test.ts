import { expect, test } from "bun:test";
import type { Sandbox } from "@tupper/sdk";
import { TupperSandbox } from "../src/index";

function fakeSandbox(): Sandbox {
	return {
		id: "sbx-1",
		commands: {
			run: async (full: string) => ({
				stdout: `ran:${full}`,
				stderr: "",
				exitCode: 0,
				signal: null,
				timedOut: false,
			}),
		},
		info: async () => ({ id: "sbx-1", backend: "tupper", status: "running" }),
		kill: async () => {},
	} as unknown as Sandbox;
}

test("executeCommand shell-quotes args and maps to a CommandResult", async () => {
	const sb = TupperSandbox.wrap(fakeSandbox());
	const r = await sb.executeCommand("echo", ["a b", "c"]);
	expect(r.success).toBe(true);
	expect(r.exitCode).toBe(0);
	expect(r.stdout).toBe("ran:echo 'a b' 'c'");
	expect(r.command).toBe("echo");
});

test("getInfo reports provider, name, and status", async () => {
	const sb = TupperSandbox.wrap(fakeSandbox());
	const info = await sb.getInfo();
	expect(info.provider).toBe("tupper");
	expect(info.name).toBe("Tupper");
	expect(info.status).toBe("running");
});
