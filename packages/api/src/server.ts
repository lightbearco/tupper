#!/usr/bin/env node
import { parseArgs } from "node:util";
import { serve } from "@hono/node-server";
import { z } from "zod";
import { createApp } from "./app";

/**
 * Standalone server entry (the `tupper-api` bin and the `start` script). Uses
 * @hono/node-server, which is built on node:http and so runs on both Node and
 * Bun. Configured by CLI flags, each falling back to an environment variable:
 *
 *   --port, -p <port>   port to listen on        (or PORT, default 3000)
 *   --host     <host>   hostname/address to bind (or HOST, default "localhost")
 */
const { values } = parseArgs({
	options: {
		port: { type: "string", short: "p" },
		host: { type: "string" },
	},
});

const portInput = values.port ?? process.env.PORT ?? 3000;
const port = z.coerce.number().int().min(1).max(65535).safeParse(portInput);
if (!port.success) {
	console.error(`Invalid port "${portInput}": expected an integer in 1–65535.`);
	process.exit(1);
}

const hostname = values.host ?? process.env.HOST ?? "localhost";

async function main(): Promise<void> {
	// createApp resolves the sandbox backend at boot; this throws (and we exit)
	// if no backend is available, rather than failing on the first request.
	const app = await createApp();
	serve({ fetch: app.fetch, port: port.data, hostname }, (info) => {
		console.log(`Tupper API listening on http://${hostname}:${info.port}`);
	});
}

main().catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
