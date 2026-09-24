import {spawn} from 'node:child_process';
import {access} from 'node:fs/promises';
import {z} from 'zod';
import {type Commit, type DataSet} from './model.js';
import {parseInfoRevision, parseInfoXml, parseLogXml} from './svn-parser.js';
import {assertSameSource, mergeCommits, readData, revisionCheckpoint, writeData} from './store.js';

const gatherOptionsSchema = z.object({
	url: z.url(),
	username: z.string().min(1).optional(),
	passwordEnv: z.string().regex(/^[a-z_]\w*$/iu),
	dataFile: z.string().min(1),
	svnBinary: z.string().min(1),
});

export type GatherOptions = z.input<typeof gatherOptionsSchema>;

type CommandResult = {readonly stdout: string; readonly stderr: string};

function runSvn(binary: string, arguments_: readonly string[], password?: string): Promise<CommandResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(binary, arguments_, {stdio: ['pipe', 'pipe', 'pipe']});
		let stdout = '';
		let stderr = '';
		child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
			stderr += chunk;
		});
		child.on('error', (error) => {
			reject(new Error(`Unable to run ${binary}: ${error.message}`, {cause: error}));
		});
		child.on('close', (code) => {
			if (code === 0) {
				resolve({stdout, stderr});
			} else {
				reject(new Error(`${binary} exited with code ${String(code)}: ${stderr.trim()}`));
			}
		});
		child.stdin.end(password === undefined ? undefined : `${password}\n`);
	});
}

function authArguments(username: string | undefined, password: string | undefined): string[] {
	const result = ['--non-interactive', '--trust-server-cert-failures=unknown-ca,cn-mismatch,expired,not-yet-valid,other'];
	if (username !== undefined) {
		result.push('--username', username);
	}
	if (password !== undefined) {
		result.push('--password-from-stdin', '--no-auth-cache');
	}
	return result;
}

async function existingData(filePath: string): Promise<DataSet | undefined> {
	try {
		await access(filePath);
	} catch {
		return undefined;
	}
	return readData(filePath);
}

export async function gather(rawOptions: GatherOptions): Promise<{readonly added: number; readonly data: DataSet}> {
	const options = gatherOptionsSchema.parse(rawOptions);
	const password = process.env[options.passwordEnv];
	const auth = authArguments(options.username, password);
	const info = await runSvn(options.svnBinary, ['info', '--xml', ...auth, options.url], password);
	const source = parseInfoXml(info.stdout, options.url);
	const headRevision = parseInfoRevision(info.stdout);
	const previous = await existingData(options.dataFile);
	if (previous !== undefined) {
		assertSameSource(previous.source, source);
	}

	const lastRevision = previous?.lastRevision ?? 0;
	let incoming: Commit[] = [];
	if (lastRevision < headRevision) {
		const log = await runSvn(options.svnBinary, ['log', '--xml', ...auth, '--revision', `${lastRevision + 1}:HEAD`, options.url], password);
		incoming = parseLogXml(log.stdout);
	}
	const commits = mergeCommits(previous?.commits ?? [], incoming);
	const data = {
		schemaVersion: 1,
		source,
		lastRevision: revisionCheckpoint(lastRevision, headRevision),
		gatheredAt: new Date().toISOString(),
		commits,
	} satisfies DataSet;
	await writeData(options.dataFile, data);
	return {added: incoming.length, data};
}
