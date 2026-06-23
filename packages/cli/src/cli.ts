#!/usr/bin/env node
import { makeProgram } from "./program";

makeProgram()
	.parseAsync(process.argv)
	.catch((err: unknown) => {
		console.error(err instanceof Error ? err.message : err);
		process.exit(1);
	});
