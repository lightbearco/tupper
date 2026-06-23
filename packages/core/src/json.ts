import type { SandboxStatus } from "./types";

/** A plain JSON object. */
export type JsonRecord = Record<string, unknown>;

/** Type guard for a non-null, non-array object. */
export function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrow an unknown value to a {@link JsonRecord}, or `undefined`. */
export function asRecord(value: unknown): JsonRecord | undefined {
	return isRecord(value) ? value : undefined;
}

/** Return `value` if it is a non-empty string, else `undefined`. */
export function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Map a backend-reported status string onto a {@link SandboxStatus}. Handles the
 * vocabularies of both Apple `container` and Docker-shaped (`nerdctl`) output.
 */
export function normalizeStatus(value: unknown): SandboxStatus {
	const v = (asString(value) ?? "").toLowerCase();
	if (v.includes("run") || v.includes("up")) return "running";
	if (
		v.includes("stop") ||
		v.includes("exit") ||
		v.includes("created") ||
		v.includes("dead")
	) {
		return "stopped";
	}
	return "unknown";
}
