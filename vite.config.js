import {defineConfig} from 'vite';

export default defineConfig({
	build: {
		outDir: 'dist/client',
		lib: {
			entry: 'src/client/main.ts',
			name: 'SvnVisualizer',
			formats: ['es'],
			fileName: () => 'main.js',
		},
		minify: true,
	},
});
