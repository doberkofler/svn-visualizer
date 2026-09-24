import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {createProgram} from './cli.js';

describe('CLI', () => {
	it('reports the package version', () => {
		const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {version: string};
		expect(createProgram().version()).toBe(packageJson.version);
	});
});
