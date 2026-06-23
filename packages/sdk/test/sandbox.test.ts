import { expect, test } from "bun:test";
import { type CreateSandboxOptions, registerBackend } from "@tupper/core";
import { fakeBackend, fakeSandboxInstance } from "@tupper/core/testing";
import { Sandbox } from "../src/sandbox";

test("Sandbox.create resolves the backend and exposes commands/files", async () => {
	let createdWith: CreateSandboxOptions | undefined;
	registerBackend(
		fakeBackend({
			name: "fake",
			create: async (opts) => {
				createdWith = opts;
				return fakeSandboxInstance();
			},
		}),
	);

	const box = await Sandbox.create({
		backend: "fake",
		backendOptions: { distro: "ubuntu" },
	});
	expect(box.id).toBe("sbx-1");
	// backend-specific options pass through Sandbox.create() to backend.create()
	expect(createdWith?.backendOptions).toEqual({ distro: "ubuntu" });

	expect((await box.commands.run("echo hi")).stdout).toBe("ran:echo hi");

	await box.files.write("/tmp/a.txt", "hello");
	expect(await box.files.read("/tmp/a.txt")).toBe("hi");
	expect(await box.files.exists("/tmp/a.txt")).toBe(true);
});
