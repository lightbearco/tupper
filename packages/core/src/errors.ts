/** Base class for all Tupper errors. */
export class TupperError extends Error {
	constructor(message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = new.target.name;
	}
}

/** No usable backend could be resolved for the current platform. */
export class BackendUnavailableError extends TupperError {}

/** A referenced sandbox does not exist. */
export class SandboxNotFoundError extends TupperError {}

/** A command exceeded its configured timeout. */
export class CommandTimeoutError extends TupperError {}
