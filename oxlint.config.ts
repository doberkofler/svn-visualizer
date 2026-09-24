import {linter as defaults} from './oxc.config.ts';

// Add custom oxlint rule overrides here.
// This file is preserved on template updates.
//
// Example:
//   rules: { 'no-console': 'off' }
//   overrides: [{ files: ['scripts/**'], rules: { 'no-console': 'off' } }]
const rules = {
	'eslint/func-style': 'off',
	'typescript/promise-function-async': 'off',
	'unicorn/max-nested-calls': ['warn', {max: 20}],
};
const overrides = [
	{
		files: ['src/client/**'],
		env: {browser: true},
		rules: {
			'typescript/no-unsafe-type-assertion': 'off',
		},
	},
	{
		files: ['src/gather.ts'],
		rules: {
			'promise/avoid-new': 'off',
		},
	},
];

const config = {
	...defaults,
	rules: {...defaults.rules, ...rules},
	overrides: [...defaults.overrides, ...overrides],
};

export default config;
