import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Sandbox } from "@tupper/sdk";
import { z } from "zod";

/** Optional backend override shared by every tool. */
const backend = z
	.string()
	.optional()
	.describe("Force a specific backend (registered name or package specifier)");

/** Wrap a string as a tool result; the return type fixes the `"text"` literal. */
const text = (body: string): CallToolResult => ({
	content: [{ type: "text", text: body }],
});

/**
 * Build the Tupper MCP server with tools that drive `@tupper/sdk` sandboxes:
 * create/list/kill sandboxes, run commands, and read/write files. Connect it to
 * a transport (e.g. {@link import("@modelcontextprotocol/sdk/server/stdio.js")})
 * to expose it to an MCP client.
 */
export function createServer(): McpServer {
	const server = new McpServer({ name: "tupper", version: "0.1.0" });

	server.registerTool(
		"create_sandbox",
		{
			description: "Create and start a new sandbox, returning its id and info.",
			inputSchema: {
				image: z.string().optional().describe("OCI image reference"),
				backend,
			},
		},
		async ({ image, backend }) => {
			const box = await Sandbox.create({ image, backend });
			const info = await box.info();
			return text(
				`Created sandbox ${box.id}\n${JSON.stringify(info, null, 2)}`,
			);
		},
	);

	server.registerTool(
		"list_sandboxes",
		{ description: "List existing sandboxes.", inputSchema: { backend } },
		async ({ backend }) => {
			const sandboxes = await Sandbox.list(backend ? { backend } : {});
			if (sandboxes.length === 0) return text("No sandboxes.");
			return text(
				sandboxes
					.map((s) => `${s.id}\t${s.status}\t${s.image ?? ""}`)
					.join("\n"),
			);
		},
	);

	server.registerTool(
		"run_command",
		{
			description:
				"Run a shell command inside a sandbox and return its output.",
			inputSchema: {
				id: z.string().describe("sandbox id"),
				command: z.string().describe("shell command to run"),
				backend,
			},
		},
		async ({ id, command, backend }) => {
			const box = await Sandbox.connect(id, backend ? { backend } : {});
			const r = await box.commands.run(command);
			return text(
				`exit code: ${r.exitCode}\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}`,
			);
		},
	);

	server.registerTool(
		"read_file",
		{
			description: "Read a UTF-8 text file from a sandbox.",
			inputSchema: {
				id: z.string().describe("sandbox id"),
				path: z.string().describe("file path inside the sandbox"),
				backend,
			},
		},
		async ({ id, path, backend }) => {
			const box = await Sandbox.connect(id, backend ? { backend } : {});
			return text(await box.files.read(path));
		},
	);

	server.registerTool(
		"write_file",
		{
			description: "Write a UTF-8 text file into a sandbox.",
			inputSchema: {
				id: z.string().describe("sandbox id"),
				path: z.string().describe("file path inside the sandbox"),
				content: z.string().describe("file content"),
				backend,
			},
		},
		async ({ id, path, content, backend }) => {
			const box = await Sandbox.connect(id, backend ? { backend } : {});
			await box.files.write(path, content);
			return text(`Wrote ${path}`);
		},
	);

	server.registerTool(
		"kill_sandbox",
		{
			description: "Stop and remove a sandbox.",
			inputSchema: { id: z.string().describe("sandbox id"), backend },
		},
		async ({ id, backend }) => {
			await Sandbox.kill(id, backend ? { backend } : {});
			return text(`Killed ${id}`);
		},
	);

	return server;
}
