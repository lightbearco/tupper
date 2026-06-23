import { expect, test } from "bun:test";
import type { RunResult } from "@tupper/core";
import { FirecrackerBackend } from "../src/backend";
import type { NerdctlCli } from "../src/cli";

function ok(stdout = ""): RunResult {
	return { stdout, stderr: "", exitCode: 0, signal: null, timedOut: false };
}

function recordingCli(responder: (args: string[]) => RunResult): {
	cli: NerdctlCli;
	calls: string[][];
} {
	const calls: string[][] = [];
	const cli: NerdctlCli = async (args) => {
		calls.push(args);
		return responder(args);
	};
	return { cli, calls };
}

test("isAvailable checks `nerdctl version`", async () => {
	const { cli, calls } = recordingCli(() => ok());
	expect(await new FirecrackerBackend({ cli }).isAvailable()).toBe(true);
	expect(calls[0]).toEqual(["version"]);
});

test("create runs with the firecracker runtime and parses the id", async () => {
	const { cli, calls } = recordingCli((args) =>
		args[0] === "run" ? ok("fc123\n") : ok(),
	);
	const box = await new FirecrackerBackend({ cli }).create({
		image: "alpine:latest",
		env: { FOO: "bar" },
		ports: [8080],
	});

	expect(box.id).toBe("fc123");
	const runArgs = calls.find((a) => a[0] === "run") ?? [];
	expect(runArgs).toContain("--detach");
	expect(runArgs.join(" ")).toContain("--runtime aws.firecracker");
	expect(runArgs).toContain("FOO=bar");
	expect(runArgs).toContain("8080:8080");
	expect(runArgs.slice(-3)).toEqual(["alpine:latest", "sleep", "infinity"]);
});

test("create maps mounts to --volume args (with :ro for readonly)", async () => {
	const { cli, calls } = recordingCli((args) =>
		args[0] === "run" ? ok("id1\n") : ok(),
	);
	await new FirecrackerBackend({ cli }).create({
		mounts: [
			{ source: "/host/data", target: "/data" },
			{ source: "/host/ro", target: "/ro", readonly: true },
		],
	});
	const runArgs = calls.find((a) => a[0] === "run") ?? [];
	expect(runArgs).toContain("/host/data:/data");
	expect(runArgs).toContain("/host/ro:/ro:ro");
});

test("list parses nerdctl NDJSON output", async () => {
	const ndjson = [
		JSON.stringify({
			ID: "c1",
			Image: "alpine:latest",
			Status: "Up 2 minutes",
		}),
		JSON.stringify({ ID: "c2", Image: "busybox", Status: "Exited (0)" }),
	].join("\n");
	const { cli } = recordingCli((args) =>
		args[0] === "ps" ? ok(ndjson) : ok(),
	);
	const infos = await new FirecrackerBackend({ cli }).list();

	expect(infos).toHaveLength(2);
	expect(infos[0]).toMatchObject({
		id: "c1",
		image: "alpine:latest",
		status: "running",
		backend: "firecracker",
	});
	expect(infos[1]).toMatchObject({ id: "c2", status: "stopped" });
});
