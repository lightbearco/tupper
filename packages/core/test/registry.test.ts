import { expect, test } from "bun:test";
import { BackendUnavailableError } from "../src/errors";
import {
	getBackend,
	listBackends,
	registerBackend,
	resolveBackend,
} from "../src/registry";
import { fakeBackend } from "../src/testing";

test("register / get / list", () => {
	const b = fakeBackend({ name: "fake-a" });
	registerBackend(b);
	expect(getBackend("fake-a")).toBe(b);
	expect(listBackends().some((x) => x.name === "fake-a")).toBe(true);
});

test("resolveBackend returns an explicitly named backend", async () => {
	const b = fakeBackend({ name: "fake-named", isAvailable: async () => false });
	registerBackend(b);
	expect(await resolveBackend({ backend: "fake-named" })).toBe(b);
});

test("resolveBackend auto-picks an available backend", async () => {
	registerBackend(fakeBackend({ name: "fake-avail" }));
	const resolved = await resolveBackend();
	expect(await resolved.isAvailable()).toBe(true);
});

test("resolveBackend throws for an unknown named backend", async () => {
	await expect(
		resolveBackend({ backend: "does-not-exist-xyz" }),
	).rejects.toBeInstanceOf(BackendUnavailableError);
});
