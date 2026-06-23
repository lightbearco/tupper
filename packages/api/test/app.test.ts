import { beforeAll, expect, test } from "bun:test";
import { registerBackend } from "@tupper/core";
import { fakeBackend } from "@tupper/core/testing";
import { createApp } from "../src/app";

const BACKEND = "fake-api";
let app: Awaited<ReturnType<typeof createApp>>;

beforeAll(async () => {
	registerBackend(fakeBackend({ name: BACKEND }));
	// The backend is resolved once here, at boot, and pinned for every request.
	app = await createApp({ backend: BACKEND });
});

const json = (body: unknown) => ({
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify(body),
});

test("GET /health reports the resolved backend", async () => {
	const res = await app.request("/health");
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ ok: true, backend: BACKEND });
});

test("POST /sandboxes creates and returns info", async () => {
	const res = await app.request("/sandboxes", json({ image: "alpine" }));
	expect(res.status).toBe(201);
	expect(await res.json()).toMatchObject({ id: "sbx-1" });
});

test("GET /sandboxes lists", async () => {
	const res = await app.request("/sandboxes");
	expect(res.status).toBe(200);
	expect(await res.json()).toMatchObject({ sandboxes: [{ id: "sbx-1" }] });
});

test("POST /sandboxes/:id/commands runs", async () => {
	const res = await app.request(
		"/sandboxes/sbx-1/commands",
		json({ command: "echo hi" }),
	);
	expect(res.status).toBe(200);
	expect(await res.json()).toMatchObject({ stdout: "ran:echo hi" });
});

test("POST /sandboxes/:id/commands requires a command", async () => {
	const res = await app.request("/sandboxes/sbx-1/commands", json({}));
	expect(res.status).toBe(400);
});

test("POST /sandboxes rejects a malformed body", async () => {
	const res = await app.request("/sandboxes", json({ cpus: "lots" }));
	expect(res.status).toBe(400);
	expect(await res.json()).toMatchObject({ error: "Invalid request body" });
});

test("file read + write round-trip", async () => {
	const put = await app.request("/sandboxes/sbx-1/files", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ path: "/tmp/a.txt", content: "hello" }),
	});
	expect(put.status).toBe(200);

	const get = await app.request("/sandboxes/sbx-1/files?path=/tmp/a.txt");
	expect(get.status).toBe(200);
	expect(await get.json()).toMatchObject({ content: "hi" });
});

test("DELETE /sandboxes/:id kills", async () => {
	const res = await app.request("/sandboxes/sbx-1", { method: "DELETE" });
	expect(res.status).toBe(204);
});
