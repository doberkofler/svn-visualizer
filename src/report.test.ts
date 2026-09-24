import {mkdtemp, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {type DataSet} from './model.js';
import {generate, renderHtml, safeJson} from './report.js';
import {writeData} from './store.js';

describe('HTML rendering', () => {
	it('escapes markup and script payloads', () => {
		const page = renderHtml(
			{
				title: '<img src=x onerror=alert(1)>',
				sourceUrl: 'https://example.test/?x=<tag>&y=1',
				generatedAt: '2026-01-01T00:00:00.000Z',
				range: {from: '2026-01-01', to: '2026-01-01'},
				total: 0,
				users: {labels: ['</script><script>alert(1)</script>'], values: [1]},
				weekdays: {labels: [], values: []},
				hours: {labels: [], values: []},
				days: {labels: [], values: []},
				daysByUser: {labels: [], datasets: []},
				months: {labels: [], values: []},
				recent: [],
			},
			'console.log("</script>")',
		);
		expect(page).not.toContain('<img src=x');
		expect(page).not.toContain('</script><script>alert');
		expect(page).toContain('&lt;img');
		expect(page).toContain(String.raw`<\/script>`);
		expect(page).toContain('<tbody id="commits">');
		expect(safeJson({value: '\u2028<&'})).toBe(String.raw`{"value":"\u2028\u003c\u0026"}`);
	});

	it('escapes commit messages embedded in the report data', () => {
		const page = renderHtml(
			{
				title: 't',
				sourceUrl: 'https://example.test/',
				generatedAt: '2026-01-01T00:00:00.000Z',
				range: {from: '2026-01-01', to: '2026-01-01'},
				total: 1,
				users: {labels: [], values: []},
				weekdays: {labels: [], values: []},
				hours: {labels: [], values: []},
				days: {labels: [], values: []},
				daysByUser: {labels: [], datasets: []},
				months: {labels: [], values: []},
				recent: [{revision: 1, author: 'ada', date: '2026-01-01T00:00:00.000Z', message: '<script>alert(1)</script>'}],
			},
			'',
		);
		expect(page).not.toContain('<script>alert(1)</script>');
		expect(page).toContain(String.raw`\u003cscript\u003ealert(1)\u003c/script\u003e`);
	});
});

describe('report generation', () => {
	it('writes a self-contained HTML report from a data file', async () => {
		const directory = await mkdtemp(path.join(tmpdir(), 'svn-visualizer-'));
		const dataFile = path.join(directory, 'data.json');
		const data: DataSet = {
			schemaVersion: 1,
			source: {requestedUrl: 'https://example.test/svn/project/trunk', root: 'https://example.test/svn/project', uuid: 'fixture'},
			lastRevision: 2,
			gatheredAt: '2026-01-03T00:00:00.000Z',
			commits: [
				{revision: 1, author: 'ada', date: '2026-01-01T12:00:00.000Z', message: 'Initial import'},
				{revision: 2, author: 'lin', date: '2026-01-02T15:30:00.000Z', message: 'Ship report'},
			],
		};
		await writeData(dataFile, data);

		const outputFile = await generate({dataFile, outputDir: path.join(directory, 'output'), title: 'Integration report'}, 'console.log("chart.js")');

		expect(outputFile).toBe(path.join(directory, 'output', 'index.html'));
		const html = await readFile(outputFile, 'utf8');
		for (const expected of [
			'Integration report',
			'2</strong>',
			'https://example.test/svn/project/trunk',
			'console.log("chart.js")',
			'Recent commits',
			'Ship report',
		]) {
			expect(html).toContain(expected);
		}
		expect(/src=["']https?:/u.test(html)).toBe(false);
	});
});
