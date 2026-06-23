import { registerBackend } from "@tupper/core";
import { FirecrackerBackend } from "./backend";

export { FirecrackerBackend, type FirecrackerBackendOptions } from "./backend";
export {
	makeCli,
	NERDCTL_BIN,
	type NerdctlCli,
	type NerdctlOptions,
} from "./cli";
export { FirecrackerInstance } from "./instance";

// Self-register on import so @tupper/core's resolveBackend() can auto-select us.
registerBackend(new FirecrackerBackend());
