import {
	asRecord,
	type JsonRecord as Json,
	normalizeStatus,
	type SandboxInfo,
	type SandboxStatus,
	asString as str,
} from "@tupper/core";

/**
 * Best-effort parsers for `nerdctl inspect` / `nerdctl ps` output, which follow
 * Docker's JSON shapes (distinct from Apple's `container`). They read defensively
 * and degrade to "unknown" rather than throwing. The generic `asRecord` / `str`
 * / `normalizeStatus` helpers live in `@tupper/core`.
 */

/** Parse a `nerdctl inspect <id>` payload (Docker-shaped JSON array). */
export function parseInspect(stdout: string): Json | undefined {
	try {
		const data: unknown = JSON.parse(stdout);
		return asRecord(Array.isArray(data) ? data[0] : data);
	} catch {
		return undefined;
	}
}

export function extractStatus(item: Json | undefined): SandboxStatus {
	return normalizeStatus(
		asRecord(item?.State)?.Status ?? item?.Status ?? item?.State,
	);
}

export function extractImage(item: Json | undefined): string | undefined {
	return str(asRecord(item?.Config)?.Image) ?? str(item?.Image);
}

export function extractAddress(item: Json | undefined): string | undefined {
	const net = asRecord(item?.NetworkSettings);
	const direct = str(net?.IPAddress);
	if (direct) return direct;
	const networks = asRecord(net?.Networks);
	if (networks) {
		for (const key of Object.keys(networks)) {
			const addr = str(asRecord(networks[key])?.IPAddress);
			if (addr) return addr;
		}
	}
	return undefined;
}

/** Parse `nerdctl ps -a --format '{{json .}}'` output (one JSON object per line). */
export function parseList(stdout: string, backend: string): SandboxInfo[] {
	const infos: SandboxInfo[] = [];
	for (const line of stdout.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		let obj: Json | undefined;
		try {
			obj = asRecord(JSON.parse(trimmed));
		} catch {
			continue;
		}
		const id = str(obj?.ID) ?? str(obj?.Id);
		if (!obj || !id) continue;
		infos.push({
			id,
			backend,
			image: str(obj.Image),
			status: normalizeStatus(obj.Status ?? obj.State),
		});
	}
	return infos;
}
