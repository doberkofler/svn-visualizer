import {defineConfig} from 'vitest/config';
import path from 'node:path';
import packageJson from './package.json' with {type: 'json'};

export default defineConfig({
	define: {
		APP_VERSION: JSON.stringify(packageJson.version),
	},
	build: {
		ssr: true,
		lib: {
			entry: path.resolve(import.meta.dirname, 'src/index.ts'),
			formats: ['es'],
			fileName: 'index',
		},
		outDir: 'dist',
		emptyOutDir: false,
		target: 'node22',
	},
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html', 'lcov'],
		},
	},
});
