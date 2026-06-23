import { registerBackend } from "@tupper/core";
import { ContainerBackend } from "./backend";

export { ContainerBackend, type ContainerCreateOptions } from "./backend";
export { CONTAINER_BIN, type ContainerCli, makeCli } from "./cli";
export { ContainerInstance } from "./instance";

// Self-register on import so @tupper/core's resolveBackend() can auto-select us.
registerBackend(new ContainerBackend());
