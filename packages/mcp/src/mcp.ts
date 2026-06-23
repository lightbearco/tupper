#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";

// The `tupper-mcp` bin: serve the Tupper MCP server over stdio.
async function main(): Promise<void> {
	const server = createServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	// Logging must go to stderr; stdout is the MCP transport.
	console.error("Tupper MCP server running on stdio");
}

main().catch((err: unknown) => {
	console.error("Fatal:", err);
	process.exit(1);
});
