import {mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {dataSchema, type Commit, type DataSet, type Source} from './model.js';

export async function readData(filePath: string): Promise<DataSet> {
	let content: string;
	try {
		content = await readFile(filePath, 'utf8');
	} catch (error: unknown) {
		throw new Error(`Unable to read data file ${filePath}: ${error instanceof Error ? error.message : String(error)}`, {cause: error});
	}
	try {
		return dataSchema.parse(JSON.parse(content) as unknown);
	} catch (error: unknown) {
		throw new Error(`Invalid data file ${filePath}: ${error instanceof Error ? error.message : String(error)}`, {cause: error});
	}
}

export function assertSameSource(existing: Source, current: Source): void {
	if (existing.requestedUrl !== current.requestedUrl || existing.root !== current.root || existing.uuid !== current.uuid) {
		throw new Error('Data file source does not match the requested SVN repository');
	}
}

export function mergeCommits(existing: readonly Commit[], incoming: readonly Commit[]): Commit[] {
	const byRevision = new Map<number, Commit>();
	for (const commit of [...existing, ...incoming]) {
		byRevision.set(commit.revision, commit);
	}
	return [...byRevision.values()].sort((left, right) => left.revision - right.revision);
}

export function revisionCheckpoint(previous: number, repositoryHead: number): number {
	return Math.max(previous, repositoryHead);
}

export async function writeData(filePath: string, data: DataSet): Promise<void> {
	const validated = dataSchema.parse(data);
	const directory = path.dirname(path.resolve(filePath));
	await mkdir(directory, {recursive: true});
	const temporary = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
	try {
		await writeFile(temporary, `${JSON.stringify(validated, null, '\t')}\n`, {encoding: 'utf8', mode: 0o600});
		await rename(temporary, path.resolve(filePath));
	} finally {
		await rm(temporary, {force: true});
	}
}
