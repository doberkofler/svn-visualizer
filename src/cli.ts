#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {exportSvnLog} from './svn.ts';
import {parseCommits} from './parser.ts';
import {aggregateCommits} from './aggregator.ts';
import {generateHtml} from './generator.ts';

/**
 * CLI argument schema
 */
const ArgsSchema = z.object({
	url: z.string().url(),
	username: z.string(),
	password: z.string(),
	'output-dir': z.string(),
	'date-range': z.string().optional(),
	'relative-days': z.coerce.number().int().positive().optional(),
});

type Args = z.infer<typeof ArgsSchema>;

/**
 * Parse CLI arguments
 */
function parseCliArgs(): Args {
	const {values} = parseArgs({
		options: {
			url: {type: 'string'},
			username: {type: 'string'},
			password: {type: 'string'},
			'output-dir': {type: 'string'},
			'date-range': {type: 'string'},
			'relative-days': {type: 'string'},
		},
		strict: true,
	});

	const result = ArgsSchema.safeParse(values);
	if (!result.success) {
		throw new Error(`Invalid arguments: ${result.error.message}`);
	}

	if (result.data['date-range'] === undefined && result.data['relative-days'] === undefined) {
		throw new Error('Either --date-range or --relative-days must be provided');
	}

	if (result.data['date-range'] !== undefined && result.data['relative-days'] !== undefined) {
		throw new Error('Cannot specify both --date-range and --relative-days');
	}

	return result.data;
}

/**
 * Calculate date range from CLI args
 */
function calculateDateRange(args: Args): {start: Date; end: Date} {
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
 * Main entry point
 */
async function main(): Promise<void> {
	const args = parseCliArgs();
	const dateRange = calculateDateRange(args);

	console.log('Fetching SVN log...');
	const xmlLog = await exportSvnLog({
		url: args.url,
		username: args.username,
		password: args.password,
		startDate: dateRange.start,
		endDate: dateRange.end,
	});

	console.log('Parsing commits...');
	const commits = parseCommits(xmlLog);

	console.log('Aggregating data...');
	const aggregated = aggregateCommits(commits, dateRange.start, dateRange.end);

	console.log('Generating HTML...');
	await generateHtml(aggregated, args['output-dir']);

	console.log(`Done. Output written to ${args['output-dir']}`);
}

main().catch((err: unknown) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
