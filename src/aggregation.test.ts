import {describe, expect, it} from 'vitest';
import {aggregate, resolveRange} from './aggregation.js';
import {type Commit} from './model.js';

const commits: Commit[] = [
	{revision: 1, author: 'ada', date: '2025-03-01T23:30:00.000Z', message: 'a'},
	{revision: 2, author: 'ada', date: '2026-02-28T00:00:00.000Z', message: 'b'},
	{revision: 3, author: null, date: '2026-03-01T01:00:00.000Z', message: 'c'},
];

describe('UTC date ranges and aggregation', () => {
	it('uses deterministic relative UTC dates', () => {
		expect(resolveRange(commits, {relativeDays: 30}, new Date('2026-03-01T23:59:59Z'))).toStrictEqual({from: '2026-01-31', to: '2026-03-01'});
	});

	it('rejects conflicts, invalid dates, and reversed dates', () => {
		expect(() => resolveRange(commits, {from: '2026-01-01', relativeDays: 2})).toThrow('cannot be used');
		expect(() => resolveRange(commits, {from: '2026-02-30'})).toThrow('Invalid UTC date');
		expect(() => resolveRange(commits, {from: '2026-03-02', to: '2026-03-01'})).toThrow('after end date');
		expect(() => resolveRange(commits, {relativeDays: 0})).toThrow('positive integer');
	});

	it('defaults to dataset bounds and today for empty data', () => {
		expect(resolveRange(commits, {}, new Date('2030-01-01T00:00:00Z'))).toStrictEqual({from: '2025-03-01', to: '2026-03-01'});
		expect(resolveRange([], {}, new Date('2026-04-05T22:00:00Z'))).toStrictEqual({from: '2026-04-05', to: '2026-04-05'});
	});

	it('produces UTC charts with exactly 30 days and months spanning the selected range', () => {
		const result = aggregate(commits, {from: '2025-03-01', to: '2026-03-01'});
		expect(result.days.labels).toHaveLength(30);
		expect(result.days.labels[0]).toBe('2026-01-31');
		expect(result.days.labels.at(-1)).toBe('2026-03-01');
		expect(result.months.labels).toHaveLength(13);
		expect(result.months.labels).toStrictEqual([
			'2025-03',
			'2025-04',
			'2025-05',
			'2025-06',
			'2025-07',
			'2025-08',
			'2025-09',
			'2025-10',
			'2025-11',
			'2025-12',
			'2026-01',
			'2026-02',
			'2026-03',
		]);
		expect(result.weekdays.values.reduce((sum, count) => sum + count, 0)).toBe(3);
		expect(result.hours.values[23]).toBe(1);
		expect(result.users).toStrictEqual({labels: ['ada', '(no author)'], values: [2, 1]});
	});

	it('anchors months to a full history range', () => {
		const result = aggregate(commits, {from: '2025-01-15', to: '2026-03-15'});
		expect(result.months.labels).toHaveLength(15);
		expect(result.months.labels[0]).toBe('2025-01');
		expect(result.months.labels.at(-1)).toBe('2026-03');
		expect(result.months.values.reduce((sum, count) => sum + count, 0)).toBe(3);
		const emptyMonth = result.months.labels.indexOf('2025-02');
		expect(result.months.values[emptyMonth]).toBe(0);
	});

	it('produces a stacked commits-per-day-and-user series over the same 30 days', () => {
		const result = aggregate(commits, {from: '2025-03-01', to: '2026-03-01'});
		expect(result.daysByUser.labels).toStrictEqual(result.days.labels);
		expect(result.daysByUser.datasets).toHaveLength(2);
		const ada = result.daysByUser.datasets.find((dataset) => dataset.label === 'ada');
		const noAuthor = result.daysByUser.datasets.find((dataset) => dataset.label === '(no author)');
		expect(ada?.values.reduce((sum, count) => sum + count, 0)).toBe(1);
		expect(noAuthor?.values.reduce((sum, count) => sum + count, 0)).toBe(1);
		expect(noAuthor?.values.at(-1)).toBe(1);
	});

	it('stacks the top-10 buckets for commits per day and user', () => {
		const many = Array.from({length: 12}, (_, index) => ({
			revision: index + 1,
			author: `user${String(index).padStart(2, '0')}`,
			date: '2026-03-01T00:00:00.000Z',
			message: 'm',
		}));
		const result = aggregate(many, {from: '2026-03-01', to: '2026-03-01'});
		expect(result.daysByUser.datasets).toHaveLength(11);
		expect(result.daysByUser.datasets.map((dataset) => dataset.label)).toStrictEqual([
			'user00',
			'user01',
			'user02',
			'user03',
			'user04',
			'user05',
			'user06',
			'user07',
			'user08',
			'user09',
			'(others)',
		]);
		const others = result.daysByUser.datasets.at(-1);
		expect(others?.values.at(-1)).toBe(2);
	});

	it('caps contributors at 10 and buckets the remainder into "(others)"', () => {
		const many = Array.from({length: 12}, (_, index) => ({
			revision: index + 1,
			author: `user${String(index).padStart(2, '0')}`,
			date: '2026-03-01T00:00:00.000Z',
			message: 'm',
		}));
		const result = aggregate(many, {from: '2026-03-01', to: '2026-03-01'});
		expect(result.users.labels).toHaveLength(11);
		expect(result.users.labels.slice(0, 10)).toStrictEqual(Array.from({length: 10}, (_, index) => `user${String(index).padStart(2, '0')}`));
		expect(result.users.labels.at(-1)).toBe('(others)');
		expect(result.users.values.at(-1)).toBe(2);
	});

	it('returns every commit from the last 30 days of the range, newest first', () => {
		const many: Commit[] = Array.from({length: 31}, (_, index) => ({
			revision: index + 1,
			author: 'ada',
			date: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
			message: `m${index}`,
		}));
		many.push({revision: 32, author: 'lin', date: '2025-12-31T00:00:00.000Z', message: 'outside'});
		const result = aggregate(many, {from: '2026-01-01', to: '2026-01-31'});
		expect(result.recentRange).toStrictEqual({from: '2026-01-02', to: '2026-01-31'});
		expect(result.recent).toHaveLength(30);
		expect(result.recent[0]?.revision).toBe(31);
		expect(result.recent.at(-1)?.revision).toBe(2);
		expect(result.recent.some((commit) => commit.revision === 1)).toBe(false);
		expect(result.recent.some((commit) => commit.revision === 32)).toBe(false);
	});

	it('clamps the recent window to the start of a short range', () => {
		const result = aggregate(commits, {from: '2026-02-28', to: '2026-03-01'});
		expect(result.recentRange).toStrictEqual({from: '2026-02-28', to: '2026-03-01'});
		expect(result.recent.map((commit) => commit.revision)).toStrictEqual([3, 2]);
	});
});
