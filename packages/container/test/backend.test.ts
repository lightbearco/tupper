import { expect, test } from "bun:test";
import type { RunResult } from "@tupper/core";
import { ContainerBackend } from "../src/backend";
import type { ContainerCli } from "../src/cli";

function ok(stdout = ""): RunResult {
	return { stdout, stderr: "", exitCode: 0, signal: null, timedOut: false };
}

function recordingCli(responder: (args: string[]) => RunResult): {
	cli: ContainerCli;
	calls: string[][];
} {
	const calls: string[][] = [];
	const cli: ContainerCli = async (args) => {
		calls.push(args);
		return responder(args);
	};
	return { cli, calls };
}

test("isAvailable checks `container system status`", async () => {
	const { cli, calls } = recordingCli(() => ok());
	expect(await new ContainerBackend({ cli }).isAvailable()).toBe(true);
	expect(calls[0]).toEqual(["system", "status"]);
});

test("create builds run args and parses the returned id", async () => {
	const { cli, calls } = recordingCli((args) =>
		args[0] === "run" ? ok("abc123\n") : ok(),
	);
	const box = await new ContainerBackend({ cli }).create({
		image: "alpine:latest",
		name: "demo",
		cwd: "/work",
		env: { FOO: "bar" },
		cpus: 2,
		memory: "512m",
		ports: [8080],
	});

	expect(box.id).toBe("abc123");
	const runArgs = calls.find((a) => a[0] === "run") ?? [];
	expect(runArgs).toContain("--detach");
	expect(runArgs).toContain("FOO=bar");
	expect(runArgs).toContain("8080:8080");
	expect(runArgs.slice(-3)).toEqual(["alpine:latest", "sleep", "infinity"]);
});

test("create maps mounts to --volume args (with :ro for readonly)", async () => {
	const { cli, calls } = recordingCli((args) =>
		args[0] === "run" ? ok("id1\n") : ok(),
	);
	await new ContainerBackend({ cli }).create({
		mounts: [
			{ source: "/host/data", target: "/data" },
			{ source: "/host/ro", target: "/ro", readonly: true },
		],
	});
	const runArgs = calls.find((a) => a[0] === "run") ?? [];
	expect(runArgs).toContain("/host/data:/data");
	expect(runArgs).toContain("/host/ro:/ro:ro");
});

test("backendOptions.noDns adds --no-dns (off by default)", async () => {
	const { cli, calls } = recordingCli((args) =>
		args[0] === "run" ? ok("id1\n") : ok(),
	);
	await new ContainerBackend({ cli }).create({
		backendOptions: { noDns: true },
	});
	expect(calls.find((a) => a[0] === "run") ?? []).toContain("--no-dns");

	const { cli: cli2, calls: calls2 } = recordingCli((args) =>
		args[0] === "run" ? ok("id2\n") : ok(),
	);
	await new ContainerBackend({ cli: cli2 }).create({});
	expect(calls2.find((a) => a[0] === "run") ?? []).not.toContain("--no-dns");
});

test("list parses JSON output into SandboxInfo", async () => {
	// Mirrors the real `container list --format json` schema (status is an object).
	const json = JSON.stringify([
		{
			id: "c1",
			status: { state: "running" },
			configuration: { image: { reference: "alpine:latest" } },
		},
		{ id: "c2", status: { state: "stopped" } },
	]);
	const { cli } = recordingCli((args) =>
		args[0] === "list" ? ok(json) : ok(),
	);
	const infos = await new ContainerBackend({ cli }).list();

	expect(infos).toHaveLength(2);
	expect(infos[0]).toMatchObject({
		id: "c1",
		status: "running",
		image: "alpine:latest",
		backend: "apple-container",
	});
	expect(infos[1]).toMatchObject({ id: "c2", status: "stopped" });
});
