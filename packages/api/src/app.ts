import {
	CreateSandboxOptionsSchema,
	ExecOptionsSchema,
	SandboxNotFoundError,
	TupperError,
} from "@tupper/core";
import { Sandbox } from "@tupper/sdk";
import { type Context, Hono } from "hono";
import { z } from "zod";

/** `POST /sandboxes` body — the core create options (the backend is fixed at boot). */
const CreateBody = CreateSandboxOptionsSchema;

/** `POST /sandboxes/:id/commands` body — a command plus the core exec options. */
const CommandBody = ExecOptionsSchema.extend({
	command: z.string().min(1),
});

/** `PUT /sandboxes/:id/files` body. */
const FileWriteBody = z.object({
	path: z.string().min(1),
	content: z.string().default(""),
});

export interface CreateAppOptions {
	/**
	 * Backend to resolve at boot, by registered name or package specifier. Omit
	 * to auto-detect the platform default.
	 */
	backend?: string;
}

/**
 * Build the Tupper HTTP API. The sandbox backend is resolved **once, at boot**
 * (auto-detected, or pinned with `options.backend`) and reused for every
 * request — there is no per-request backend selection. Request bodies are
 * validated with Zod. Returns a Hono app whose `.fetch` runs on any Web-standard
 * server, so it can also be mounted into an existing Hono app.
 */
export async function createApp(options: CreateAppOptions = {}): Promise<Hono> {
	const backend = await Sandbox.resolveBackend({ backend: options.backend });
	// Pinning the resolved name makes every later call a fast registry lookup
	// instead of re-running backend detection.
	const pin = { backend: backend.name };

	const app = new Hono();

	app.get("/health", (c) => c.json({ ok: true, backend: backend.name }));

	// List sandboxes.
	app.get("/sandboxes", async (c) => {
		const sandboxes = await Sandbox.list(pin);
		return c.json({ sandboxes });
	});

	// Create and start a sandbox.
	app.post("/sandboxes", async (c) => {
		const parsed = await parseBody(c, CreateBody);
		if (!parsed.ok) return parsed.response;
		const box = await Sandbox.create({ ...parsed.data, ...pin });
		return c.json(await box.info(), 201);
	});

	// Inspect a sandbox.
	app.get("/sandboxes/:id", async (c) => {
		const box = await Sandbox.connect(c.req.param("id"), pin);
		return c.json(await box.info());
	});

	// Stop and remove a sandbox.
	app.delete("/sandboxes/:id", async (c) => {
		await Sandbox.kill(c.req.param("id"), pin);
		return c.body(null, 204);
	});

	// Run a command.
	app.post("/sandboxes/:id/commands", async (c) => {
		const parsed = await parseBody(c, CommandBody);
		if (!parsed.ok) return parsed.response;
		const { command, ...execOptions } = parsed.data;
		const box = await Sandbox.connect(c.req.param("id"), pin);
		return c.json(await box.commands.run(command, execOptions));
	});

	// Read a file as UTF-8 text: `?path=/abs/path`.
	app.get("/sandboxes/:id/files", async (c) => {
		const path = c.req.query("path");
		if (!path) return c.json({ error: "`path` query param is required" }, 400);
		const box = await Sandbox.connect(c.req.param("id"), pin);
		return c.json({ path, content: await box.files.read(path) });
	});

	// Write a file.
	app.put("/sandboxes/:id/files", async (c) => {
		const parsed = await parseBody(c, FileWriteBody);
		if (!parsed.ok) return parsed.response;
		const box = await Sandbox.connect(c.req.param("id"), pin);
		await box.files.write(parsed.data.path, parsed.data.content);
		return c.json({ path: parsed.data.path });
	});

	app.onError((err, c) => {
		if (err instanceof SandboxNotFoundError) {
			return c.json({ error: err.message }, 404);
		}
		if (err instanceof TupperError) {
			return c.json({ error: err.message }, 400);
		}
		const message = err instanceof Error ? err.message : "internal error";
		return c.json({ error: message }, 500);
	});

	return app;
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

/** Validate the JSON body against `schema`, or produce a 400 response. */
async function parseBody<S extends z.ZodType>(
	c: Context,
	schema: S,
): Promise<Parsed<z.infer<S>>> {
	let raw: unknown;
	try {
		raw = await c.req.json();
	} catch {
		raw = undefined;
	}
	const result = schema.safeParse(raw);
	if (!result.success) {
		return {
			ok: false,
			response: c.json(
				{ error: "Invalid request body", issues: result.error.issues },
				400,
			),
		};
	}
	return { ok: true, data: result.data };
}
