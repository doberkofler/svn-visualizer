import {describe, expect, it} from 'vitest';
import {parseInfoRevision, parseInfoXml, parseLogXml} from './svn-parser.js';

describe('SVN XML parser', () => {
	it('parses entities and a singleton log entry', () => {
		const commits = parseLogXml(
			`<?xml version="1.0"?><log><logentry revision="7"><author>A &amp; B</author><date>2026-02-03T04:05:06.000Z</date><msg>Fix &lt;thing&gt;</msg></logentry></log>`,
		);
		expect(commits).toStrictEqual([{revision: 7, author: 'A & B', date: '2026-02-03T04:05:06.000Z', message: 'Fix <thing>'}]);
	});

	it('handles empty and missing optional text nodes', () => {
		expect(parseLogXml('<?xml version="1.0"?><log></log>')).toStrictEqual([]);
		expect(parseLogXml('<log><logentry revision="1"><date>2026-01-01T00:00:00Z</date><msg/></logentry></log>')).toStrictEqual([
			{revision: 1, author: null, date: '2026-01-01T00:00:00Z', message: ''},
		]);
	});

	it('rejects malformed XML', () => {
		expect(() => parseLogXml('<log>')).toThrow(/Invalid SVN XML:/u);
	});

	it('parses repository identity', () => {
		const source = parseInfoXml(
			'<info><entry revision="0"><repository><root>https://example.test/svn/root</root><uuid>abc-123</uuid></repository></entry></info>',
			'https://example.test/svn/root/trunk',
		);
		expect(source.uuid).toBe('abc-123');
		expect(source.requestedUrl).toContain('/trunk');
		expect(
			parseInfoRevision('<info><entry revision="0"><repository><root>https://example.test/svn/root</root><uuid>abc-123</uuid></repository></entry></info>'),
		).toBe(0);
	});
});
