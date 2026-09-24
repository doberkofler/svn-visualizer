import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {type Commit, type DataSet, type Source} from './model.js';
import {assertSameSource, mergeCommits, readData, revisionCheckpoint, writeData} from './store.js';

const source: Source = {requestedUrl: 'https://example.test/svn/trunk', root: 'https://example.test/svn', uuid: 'uuid'};
const commits: Commit[] = [
	{revision: 2, author: 'ada', date: '2026-01-02T00:00:00.000Z', message: 'two'},
	{revision: 1, author: null, date: '2026-01-01T00:00:00.000Z', message: 'one'},
];

describe('data store', () => {
	it('round-trips validated data atomically', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'svn-visualizer-'));
		const file = path.join(directory, 'nested', 'data.json');
		const data: DataSet = {schemaVersion: 1, source, lastRevision: 2, gatheredAt: '2026-01-03T00:00:00.000Z', commits};
		await writeData(file, data);
		await expect(readData(file)).resolves.toStrictEqual(data);
		await expect(readFile(file, 'utf8')).resolves.toContain('\n\t"source"');
	});

	it('rejects invalid external state', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'svn-visualizer-'));
		const file = path.join(directory, 'data.json');
		await writeFile(file, '{"schemaVersion":2}', 'utf8');
		await expect(readData(file)).rejects.toThrow('Invalid data file');
	});

	it('rejects source mismatches', () => {
		expect(() => {
			assertSameSource(source, {...source, uuid: 'other'});
		}).toThrow('does not match');
		expect(() => {
			assertSameSource(source, source);
		}).not.toThrow();
	});

	it('sorts, deduplicates, and checkpoints revisions', () => {
		const [original] = commits;
		if (original === undefined) {
			throw new Error('Test fixture is missing a commit');
		}
		const replacement = {...original, message: 'updated'};
		const merged = mergeCommits(commits, [replacement, {revision: 3, author: 'lin', date: '2026-01-03T00:00:00.000Z', message: 'three'}]);
		expect(merged.map((commit) => commit.revision)).toStrictEqual([1, 2, 3]);
		expect(merged[1]?.message).toBe('updated');
		expect(revisionCheckpoint(0, 3)).toBe(3);
		expect(revisionCheckpoint(9, 0)).toBe(9);
	});
});
