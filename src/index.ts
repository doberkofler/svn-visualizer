#!/usr/bin/env node
import {createProgram} from './cli.js';

try {
	await createProgram().parseAsync();
} catch (error: unknown) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
