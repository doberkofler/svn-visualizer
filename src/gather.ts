#!/usr/bin/env node --experimental-strip-types
import {parseArgs} from 'node:util';
import {z} from 'zod';
import {exportSvnLog} from './svn.ts';
import {parseCommits, type Commit} from './parser.ts';
import {serializeData, deserializeData} from './serializer.ts';
import {existsSync} from 'node:fs';

/**
 * Gather command arguments
 */
const GatherArgsSchema = z.strictObject({
	url: z.url(),
	username: z.string(),
	password: z.string(),
	help: z.boolean().default(false),
});

type GatherArgs = z.infer<typeof GatherArgsSchema>;

const DATA_FILE = 'svn_data.json';

/**
 * Display help message
 */
function showHelp(): void {
	console.log(`
SVN Visualizer - Gather commit data from SVN repository

USAGE:
  node src/gather.ts [options]

OPTIONS:
  --url <url>              SVN repository URL (required)
  --username <user>        SVN username (required)
  --password <pass>        SVN password (required)
  --help                   Show this help message

Data is always saved to: ${DATA_FILE}

The tool works incrementally:
- If ${DATA_FILE} does not exist, all repository history is fetched
- If ${DATA_FILE} exists, only new commits since the last gather are fetched

EXAMPLES:
  # Initial gather (fetches all history)
  node src/gather.ts \\
    --url https://svn.example.com/repo \\
    --username myuser \\
    --password mypass

  # Subsequent runs (fetch only new commits)
  node src/gather.ts \\
    --url https://svn.example.com/repo \\
    --username myuser \\
    --password mypass
`);
}

/**
 * Parse CLI arguments
 */
function parseCliArgs(): GatherArgs {
	const {values} = parseArgs({
		options: {
			help: {type: 'boolean'},
			url: {type: 'string'},
			username: {type: 'string'},
			password: {type: 'string'},
		},
		strict: false,
	});

	if (values.help === true) {
		showHelp();
		process.exit(0);
	}

	const result = GatherArgsSchema.safeParse(values);
	if (!result.success) {
		const issues = result.error.issues;
		console.error('Error: Invalid arguments\n');

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
 * Execute gather command
 */
async function executeGather(args: GatherArgs): Promise<void> {
	let dateRange: {start: Date; end: Date} | null = null;
	let existingCommits: Commit[] = [];
	const isIncremental = existsSync(DATA_FILE);

	// Handle incremental mode
	if (isIncremental) {
		console.log('Existing data file found, working incrementally...');
		console.log('Loading existing data...');
		const existingData = await deserializeData(DATA_FILE);
		existingCommits = existingData.commits;

		// Fetch commits since the last commit date
		const lastCommitDate = existingData.dateRange.end;
		const now = new Date();

		// Add 1 second to avoid duplicate
		const incrementalStart = new Date(lastCommitDate.getTime() + 1000);

		if (incrementalStart >= now) {
			console.log('No new commits to fetch (data is up to date)');
			return;
		}

		dateRange = {start: incrementalStart, end: now};
		console.log(`Fetching incremental updates from ${dateRange.start.toISOString().split('T')[0]} to ${dateRange.end.toISOString().split('T')[0]}...`);
	} else {
		console.log('No existing data file found, fetching all SVN logs...');
	}

	const xmlLog = await exportSvnLog({
		url: args.url,
		username: args.username,
		password: args.password,
		startDate: dateRange?.start ?? null,
		endDate: dateRange?.end ?? null,
	});

	console.log('Parsing commits...');
	const newCommits = parseCommits(xmlLog);

	if (newCommits.length === 0) {
		if (isIncremental) {
			console.log('No new commits found');
			return;
		} else {
			console.log('No commits found');
			return;
		}
	}

	console.log(`Found ${newCommits.length} commit${newCommits.length === 1 ? '' : 's'}`);

	// Merge commits if incremental
	let allCommits = newCommits;
	if (isIncremental) {
		// Remove duplicates by revision number
		const existingRevisions = new Set(existingCommits.map((c) => c.revision));
		const uniqueNewCommits = newCommits.filter((c) => !existingRevisions.has(c.revision));

		allCommits = [...existingCommits, ...uniqueNewCommits];
		console.log(`Total commits after merge: ${allCommits.length} (${uniqueNewCommits.length} new)`);
	}

	// Calculate actual date range from all commits
	const commitDates = allCommits.map((c) => c.date.getTime());
	const actualDateRange = {
		start: new Date(Math.min(...commitDates)),
		end: new Date(Math.max(...commitDates)),
	};

	console.log('Serializing data...');
	await serializeData(allCommits, actualDateRange, DATA_FILE);

	console.log(`Data saved to ${DATA_FILE}`);
	console.log(`Date range: ${actualDateRange.start.toISOString().split('T')[0]} to ${actualDateRange.end.toISOString().split('T')[0]}`);
	console.log(`Total commits: ${allCommits.length}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
	const args = parseCliArgs();
	await executeGather(args);
}

main().catch((err: unknown) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
