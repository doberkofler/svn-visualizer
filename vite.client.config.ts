import path from 'node:path';
import {defineConfig} from 'vite';

export default defineConfig({
	build: {
		lib: {
			entry: path.resolve(import.meta.dirname, 'src/client/main.ts'),
			formats: ['es'],
			fileName: 'main',
		},
		outDir: 'dist/client',
		emptyOutDir: true,
		target: 'es2022',
	},
});
