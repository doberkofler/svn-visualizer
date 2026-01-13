#!/usr/bin/env node --experimental-strip-types
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {aggregateCommits} from './aggregator.ts';
import {generateHtml} from './generator.ts';
import {deserializeData} from './serializer.ts';

/**
 * Generate command arguments
 */
const GenerateArgsSchema = z.strictObject({
	'output-dir': z.string().default('output'),
	'date-range': z.string().optional(),
	'relative-days': z.coerce.number().int().positive().optional(),
	help: z.boolean().default(false),
});

type GenerateArgs = z.infer<typeof GenerateArgsSchema>;

const DATA_FILE = 'svn_data.json';

/**
 * Display help message
 */
function showHelp(): void {
	console.log(`
SVN Visualizer - Generate HTML visualizations from saved data

USAGE:
  node src/generate.ts [options]

OPTIONS:
  --output-dir <path>      Output directory for HTML (default: output)
  --date-range <range>     Override date range for aggregation
  --relative-days <days>   Override with relative date range
  --help                   Show this help message

Data is always read from: ${DATA_FILE}
If no date range is provided, uses the range stored in the data file.

EXAMPLES:
  # Generate visualizations with default settings
  node src/generate.ts

  # Generate with custom output directory
  node src/generate.ts --output-dir ./reports

  # Generate for last 7 days only
  node src/generate.ts --relative-days 7
`);
}

/**
 * Parse CLI arguments
 */
function parseCliArgs(): GenerateArgs {
	const {values} = parseArgs({
		options: {
			help: {type: 'boolean'},
			'output-dir': {type: 'string'},
			'date-range': {type: 'string'},
			'relative-days': {type: 'string'},
		},
		strict: false,
	});

	if (values.help === true) {
		showHelp();
		process.exit(0);
	}

	const result = GenerateArgsSchema.safeParse(values);
	if (!result.success) {
		const issues = result.error.issues;
		console.error('Error: Invalid arguments\n');

		for (const issue of issues) {
			const field = issue.path.join('.');
			if (field === 'relative-days') {
				console.error('  --relative-days must be a positive integer');
			} else {
				console.error(`  ${issue.message}`);
			}
		}

		console.error('\nUse --help for more information\n');
		process.exit(1);
	}

	return result.data;
}

/**
 * Calculate date range from CLI args
 */
function calculateDateRange(args: Pick<GenerateArgs, 'date-range' | 'relative-days'>): {start: Date; end: Date} | null {
	if (args['date-range'] === undefined && args['relative-days'] === undefined) {
		return null;
	}

	const end = new Date();

	if (args['relative-days'] !== undefined) {
		const start = new Date();
		start.setDate(start.getDate() - args['relative-days']);
		return {start, end};
	}

	if (args['date-range'] !== undefined) {
		const match = /^(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(args['date-range']);
		if (match?.[1] === undefined || match[2] === undefined) {
			throw new Error('Invalid date-range format. Expected: YYYY-MM-DD:YYYY-MM-DD');
		}
		const start = new Date(match[1]);
		const endDate = new Date(match[2]);

		if (isNaN(start.getTime()) || isNaN(endDate.getTime())) {
			throw new Error('Invalid date values in date-range');
		}

		return {start, end: endDate};
	}

	throw new Error('Unreachable: date range not specified');
}

/**
 * Execute generate command
 */
async function executeGenerate(args: GenerateArgs): Promise<void> {
	console.log('Loading data...');
	const data = await deserializeData(DATA_FILE);

	console.log(`Loaded ${data.commits.length} commit${data.commits.length === 1 ? '' : 's'}`);

	let dateRange: {start: Date; end: Date};
	if (args['date-range'] !== undefined || args['relative-days'] !== undefined) {
		console.log('Using date range from CLI arguments...');
		const calculatedRange = calculateDateRange(args);
		if (calculatedRange === null) {
			throw new Error('Unreachable: generate command should have date range');
		}
		dateRange = calculatedRange;
	} else {
		console.log('Using date range from data file...');
		dateRange = data.dateRange;
	}

	console.log(`Aggregating data from ${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}...`);
	const aggregated = aggregateCommits(data.commits, dateRange.start, dateRange.end);

	console.log('Generating HTML...');
	await generateHtml(aggregated, args['output-dir']);

	console.log(`Done. Output written to ${args['output-dir']}/index.html`);
	console.log('Note: Make sure to run "npm run build:client" first to build the client JavaScript.');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	const args = parseCliArgs();
	await executeGenerate(args);
}

main().catch((err: unknown) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
