import { beforeAll, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerBackend } from "@tupper/core";
import { fakeBackend } from "@tupper/core/testing";
import { z } from "zod";
import { createServer } from "../src/server";

const BACKEND = "fake-mcp";

beforeAll(() => {
	registerBackend(fakeBackend({ name: BACKEND }));
});

/** Connect a client to a fresh server over an in-memory transport pair. */
async function connectClient(): Promise<Client> {
	const server = createServer();
	const [clientTransport, serverTransport] =
		InMemoryTransport.createLinkedPair();
	const client = new Client({ name: "test", version: "0.0.0" });
	await Promise.all([
		server.connect(serverTransport),
		client.connect(clientTransport),
	]);
	return client;
}

const ToolResult = z.object({
	content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

/** Validate a tool result and return the first text block, if any. */
function firstText(result: unknown): string {
	const parsed = ToolResult.safeParse(result);
	if (!parsed.success) return "";
	return parsed.data.content.find((c) => c.type === "text")?.text ?? "";
}

test("lists the expected tools", async () => {
	const client = await connectClient();
	const names = (await client.listTools()).tools.map((t) => t.name).sort();
	expect(names).toEqual([
		"create_sandbox",
		"kill_sandbox",
		"list_sandboxes",
		"read_file",
		"run_command",
		"write_file",
	]);
});

test("create_sandbox returns the id", async () => {
	const client = await connectClient();
	const res = await client.callTool({
		name: "create_sandbox",
		arguments: { image: "alpine", backend: BACKEND },
	});
	expect(firstText(res)).toContain("sbx-1");
});

test("run_command returns command output", async () => {
	const client = await connectClient();
	const res = await client.callTool({
		name: "run_command",
		arguments: { id: "sbx-1", command: "echo hi", backend: BACKEND },
	});
	expect(firstText(res)).toContain("ran:echo hi");
});

test("read_file returns file contents", async () => {
	const client = await connectClient();
	const res = await client.callTool({
		name: "read_file",
		arguments: { id: "sbx-1", path: "/tmp/a.txt", backend: BACKEND },
	});
	expect(firstText(res)).toBe("hi");
});
