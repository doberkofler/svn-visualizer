import {Command, Option} from 'commander';
import {gather, type GatherOptions} from './gather.js';
import {generate, type GenerateOptions} from './report.js';

declare const APP_VERSION: string;

type CommonGatherOptions = Omit<GatherOptions, 'url'> & {readonly url: string};

function positiveInteger(value: string): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error('Expected a positive integer');
	}
	return parsed;
}

function gatherOptions(command: Command): Command {
	return command
		.requiredOption('--url <url>', 'SVN repository URL')
		.option('--username <username>', 'SVN username')
		.option('--password-env <name>', 'environment variable containing the SVN password', 'SVN_PASSWORD')
		.option('--data-file <path>', 'JSON state file', 'svn-data.json')
		.option('--svn-binary <path>', 'SVN executable', 'svn');
}

function generateOptions(command: Command, includeDataFile = true): Command {
	if (includeDataFile) {
		command.option('--data-file <path>', 'JSON state file', 'svn-data.json');
	}
	return command
		.option('--output-dir <path>', 'report output directory', 'output')
		.option('--from <date>', 'first UTC date (YYYY-MM-DD)')
		.option('--to <date>', 'last UTC date (YYYY-MM-DD)')
		.addOption(new Option('--relative-days <days>', 'rolling number of UTC days').argParser(positiveInteger))
		.option('--title <title>', 'report title', 'Subversion activity');
}

export function createProgram(): Command {
	const program = new Command().name('svn-visualizer').description('Generate standalone HTML activity reports from Subversion history').version(APP_VERSION);

	gatherOptions(program.command('gather').description('Incrementally gather SVN history')).action(async (options: CommonGatherOptions) => {
		const result = await gather(options);
		console.log(result.added === 0 ? 'No new commits.' : `Gathered ${String(result.added)} new commit(s).`);
	});

	generateOptions(program.command('generate').description('Generate a standalone HTML report')).action(async (options: GenerateOptions) => {
		const output = await generate(options);
		console.log(`Generated ${output}`);
	});

	generateOptions(gatherOptions(program.command('report').description('Gather history and generate a report')), false).action(
		async (options: CommonGatherOptions & GenerateOptions) => {
			const result = await gather(options);
			console.log(result.added === 0 ? 'No new commits.' : `Gathered ${String(result.added)} new commit(s).`);
			const output = await generate(options);
			console.log(`Generated ${output}`);
		},
	);

	return program;
}
