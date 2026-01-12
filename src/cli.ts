#!/usr/bin/env node --experimental-strip-types
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {exportSvnLog} from './svn.ts';
import {parseCommits} from './parser.ts';
import {aggregateCommits} from './aggregator.ts';
import {generateHtml} from './generator.ts';
import {serializeData, deserializeData} from './serializer.ts';

/**
 * Gather command arguments
 */
const GatherArgsSchema = z.strictObject({
	command: z.literal('gather'),
	url: z.url(),
	username: z.string(),
	password: z.string(),
	'data-file': z.string().default('svn_data.json'),
	'date-range': z.string().optional(),
	'relative-days': z.coerce.number().int().positive().optional(),
});

/**
 * Generate command arguments
 */
const GenerateArgsSchema = z.strictObject({
	command: z.literal('generate'),
	'data-file': z.string().default('svn_data.json'),
	'output-dir': z.string().default('output'),
	'date-range': z.string().optional(),
	'relative-days': z.coerce.number().int().positive().optional(),
});

type GatherArgs = z.infer<typeof GatherArgsSchema>;
type GenerateArgs = z.infer<typeof GenerateArgsSchema>;
type Args = GatherArgs | GenerateArgs;

/**
 * Display help message
 */
function showHelp(): void {
	console.log(`
SVN Visualizer - Extract and visualize SVN commit data

USAGE:
  node src/cli.ts <command> [options]

COMMANDS:
  gather      Fetch commit data from SVN repository and save to file
  generate    Generate HTML visualizations from saved data

GATHER OPTIONS:
  --url <url>              SVN repository URL (required)
  --username <user>        SVN username (required)
  --password <pass>        SVN password (required)
  --data-file <path>       Path to save data file (default: svn_data.json)
  --date-range <range>     Date range as YYYY-MM-DD:YYYY-MM-DD
  --relative-days <days>   Number of days to look back from today
  
  If neither --date-range nor --relative-days is provided, all history is fetched.
  Cannot use both --date-range and --relative-days together.

GENERATE OPTIONS:
  --data-file <path>       Path to data file (default: svn_data.json)
  --output-dir <path>      Output directory for HTML (default: output)
  --date-range <range>     Override date range for aggregation
  --relative-days <days>   Override with relative date range
  
  If no date range is provided, uses the range stored in the data file.

EXAMPLES:
  # Gather all repository history
  node src/cli.ts gather \\
    --url https://svn.example.com/repo \\
    --username myuser \\
    --password mypass

  # Gather last 30 days
  node src/cli.ts gather \\
    --url https://svn.example.com/repo \\
    --username myuser \\
    --password mypass \\
    --relative-days 30

  # Generate visualizations
  node src/cli.ts generate

  # Generate with custom output directory
  node src/cli.ts generate --output-dir ./reports

HELP:
  --help                   Show this help message
`);
}

/**
 * Parse CLI arguments
 */
function parseCliArgs(): Args {
	const {values, positionals} = parseArgs({
		options: {
			help: {type: 'boolean'},
			url: {type: 'string'},
			username: {type: 'string'},
			password: {type: 'string'},
			'data-file': {type: 'string'},
			'output-dir': {type: 'string'},
			'date-range': {type: 'string'},
			'relative-days': {type: 'string'},
		},
		allowPositionals: true,
		strict: false,
	});

	if (values.help === true) {
		showHelp();
		process.exit(0);
	}

	const command = positionals[0];
	if (command === undefined) {
		console.error('Error: Command required\n');
		console.error('Available commands: gather, generate');
		console.error('Use --help for more information\n');
		process.exit(1);
	}

	const args = {command, ...values};

	switch (command) {
		case 'gather': {
			if (values['output-dir'] !== undefined) {
				console.error("Error: Invalid option '--output-dir' for gather command\n");
				console.error("Did you mean '--data-file'?");
				console.error('Use --help for more information\n');
				process.exit(1);
			}

			const result = GatherArgsSchema.safeParse(args);
			if (!result.success) {
				const issues = result.error.issues;
				console.error('Error: Invalid arguments for gather command\n');

				for (const issue of issues) {
					const field = issue.path.join('.');
					if (field === 'url') {
						if (issue.code === 'invalid_type') {
							console.error('  --url is required');
						} else {
							console.error('  --url must be a valid URL');
						}
					} else if (field === 'username') {
						console.error('  --username is required');
					} else if (field === 'password') {
						console.error('  --password is required');
					} else if (field === 'relative-days') {
						console.error('  --relative-days must be a positive integer');
					} else {
						console.error(`  ${issue.message}`);
					}
				}

				console.error('\nUse --help for more information\n');
				process.exit(1);
			}

			if (result.data['date-range'] !== undefined && result.data['relative-days'] !== undefined) {
				console.error('Error: Cannot specify both --date-range and --relative-days\n');
				console.error('Use --help for more information\n');
				process.exit(1);
			}

			return result.data;
		}

		case 'generate': {
			if (values.url !== undefined || values.username !== undefined || values.password !== undefined) {
				console.error("Error: Options '--url', '--username', and '--password' are only valid for gather command\n");
				console.error('Use --help for more information\n');
				process.exit(1);
			}

			const result = GenerateArgsSchema.safeParse(args);
			if (!result.success) {
				const issues = result.error.issues;
				console.error('Error: Invalid arguments for generate command\n');

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

		default: {
			console.error(`Error: Unknown command '${command}'\n`);
			console.error('Available commands: gather, generate');
			console.error('Use --help for more information\n');
			process.exit(1);
		}
	}
}

/**
 * Calculate date range from CLI args
 */
function calculateDateRange(args: Pick<Args, 'date-range' | 'relative-days'>): {start: Date; end: Date} | null {
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
 * Execute gather command
 */
async function executeGather(args: GatherArgs): Promise<void> {
	const dateRange = calculateDateRange(args);

	if (dateRange === null) {
		console.log('Fetching all SVN logs...');
	} else {
		console.log(`Fetching SVN logs from ${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}...`);
	}

	const xmlLog = await exportSvnLog({
		url: args.url,
		username: args.username,
		password: args.password,
		startDate: dateRange?.start ?? null,
		endDate: dateRange?.end ?? null,
	});

	console.log('Parsing commits...');
	const commits = parseCommits(xmlLog);

	if (commits.length === 0) {
		console.log('No commits found');
		return;
	}

	console.log(`Found ${commits.length} commit${commits.length === 1 ? '' : 's'}`);

	// Calculate actual date range from commits
	const commitDates = commits.map((c) => c.date.getTime());
	const actualDateRange = {
		start: new Date(Math.min(...commitDates)),
		end: new Date(Math.max(...commitDates)),
	};

	console.log('Serializing data...');
	await serializeData(commits, actualDateRange, args['data-file']);

	console.log(`Data saved to ${args['data-file']}`);
	console.log(`Date range: ${actualDateRange.start.toISOString().split('T')[0]} to ${actualDateRange.end.toISOString().split('T')[0]}`);
}

/**
 * Execute generate command
 */
async function executeGenerate(args: GenerateArgs): Promise<void> {
	console.log('Loading data...');
	const data = await deserializeData(args['data-file']);

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

	console.log('Generating HTML and data files...');
	await generateHtml(aggregated, args['output-dir']);

	console.log(`Done. Output written to ${args['output-dir']}/index.html`);
	console.log('Note: Make sure to run "npm run build:client" first to build the client JavaScript.');
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	const args = parseCliArgs();

	switch (args.command) {
		case 'gather':
			await executeGather(args);
			break;

		case 'generate':
			await executeGenerate(args);
			break;

		default: {
			const exhaustiveCheck: never = args;
			throw new Error(`Unhandled command: ${String(exhaustiveCheck)}`);
		}
	}
}

main().catch((err: unknown) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
