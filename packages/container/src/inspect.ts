import {
	asRecord,
	type JsonRecord as Json,
	normalizeStatus,
	type SandboxInfo,
	type SandboxStatus,
	asString as str,
} from "@tupper/core";

/**
 * Best-effort parsers for `container inspect` / `container ls --format json`.
 *
 * The Apple `container` JSON schema is not contractually stable, so these read
 * defensively from a few likely shapes and degrade to "unknown" rather than
 * throwing. Adjust the field lookups here as the real output is confirmed. The
 * generic `asRecord` / `str` / `normalizeStatus` helpers live in `@tupper/core`.
 */

export function extractId(item: Json | undefined): string | undefined {
	return (
		str(item?.id) ?? str(item?.ID) ?? str(asRecord(item?.configuration)?.id)
	);
}

export function extractImage(item: Json | undefined): string | undefined {
	const image = asRecord(item?.configuration)?.image;
	return str(asRecord(image)?.reference) ?? str(image) ?? str(item?.image);
}

export function extractStatus(item: Json | undefined): SandboxStatus {
	// In container 1.x `status` is an object ({ state, networks, startedDate }),
	// but may be a bare string in other versions — handle both.
	const status = item?.status;
	const state = asRecord(status)?.state ?? status;
	return normalizeStatus(state ?? item?.state);
}

export function extractAddress(item: Json | undefined): string | undefined {
	// Networks live under `status.networks[].ipv4Address` (CIDR notation).
	const networks = asRecord(item?.status)?.networks ?? item?.networks;
	if (Array.isArray(networks)) {
		for (const n of networks) {
			const rec = asRecord(n);
			const addr = str(rec?.ipv4Address) ?? str(rec?.address);
			if (addr) return addr.split("/")[0];
		}
	}
	return str(item?.address);
}

/** Parse `container ls --format json` output into {@link SandboxInfo}s. */
export function parseList(stdout: string, backend: string): SandboxInfo[] {
	let data: unknown;
	try {
		data = JSON.parse(stdout);
	} catch {
		return [];
	}
	const items = Array.isArray(data) ? data : [data];
	const infos: SandboxInfo[] = [];
	for (const raw of items) {
		const item = asRecord(raw);
		const id = extractId(item);
		if (!item || !id) continue;
		infos.push({
			id,
			backend,
			image: extractImage(item),
			status: extractStatus(item),
		});
	}
	return infos;
}
