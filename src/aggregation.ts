import {z} from 'zod';
import {type Commit} from './model.js';

const DAY_MS = 86_400_000;
const dateTextSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u, 'Expected YYYY-MM-DD');

export const DEFAULT_CONTRIBUTORS = 10;
export const RECENT_DAYS = 30;
export const OTHER_CONTRIBUTORS_LABEL = '(others)';

export type DateRange = {readonly from: string; readonly to: string};
export type Series = {readonly labels: string[]; readonly values: number[]};
export type StackedDataset = {readonly label: string; readonly values: number[]};
export type StackedSeries = {readonly labels: string[]; readonly datasets: StackedDataset[]};
export type ReportData = {
	readonly range: DateRange;
	readonly recentRange: DateRange;
	readonly total: number;
	readonly users: Series;
	readonly weekdays: Series;
	readonly hours: Series;
	readonly days: Series;
	readonly daysByUser: StackedSeries;
	readonly months: Series;
	readonly recent: Commit[];
};

function parseDateText(value: string): Date {
	dateTextSchema.parse(value);
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
		throw new Error(`Invalid UTC date: ${value}`);
	}
	return date;
}

function dateText(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function addDays(value: string, amount: number): string {
	const date = parseDateText(value);
	return dateText(new Date(date.getTime() + amount * DAY_MS));
}

function datasetBounds(commits: readonly Commit[], today: string): DateRange {
	if (commits.length === 0) {
		return {from: today, to: today};
	}
	const dates = commits.map((commit) => commit.date.slice(0, 10)).sort();
	const [first] = dates;
	const last = dates.at(-1);
	if (first === undefined || last === undefined) {
		return {from: today, to: today};
	}
	return {from: first, to: last};
}

export function resolveRange(
	commits: readonly Commit[],
	options: {readonly from?: string | undefined; readonly to?: string | undefined; readonly relativeDays?: number | undefined},
	now = new Date(),
): DateRange {
	const today = dateText(now);
	parseDateText(today);
	if (options.relativeDays !== undefined) {
		if (options.from !== undefined || options.to !== undefined) {
			throw new Error('--from/--to cannot be used with --relative-days');
		}
		if (!Number.isInteger(options.relativeDays) || options.relativeDays <= 0) {
			throw new Error('--relative-days must be a positive integer');
		}
		return {from: addDays(today, 1 - options.relativeDays), to: today};
	}
	const bounds = datasetBounds(commits, today);
	const from = options.from ?? bounds.from;
	const to = options.to ?? bounds.to;
	parseDateText(from);
	parseDateText(to);
	if (from > to) {
		throw new Error(`Report start date ${from} is after end date ${to}`);
	}
	return {from, to};
}

function countSeries(labels: readonly string[], keys: readonly string[]): Series {
	const counts = new Map(labels.map((label) => [label, 0]));
	for (const key of keys) {
		if (counts.has(key)) {
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	return {labels: [...labels], values: labels.map((label) => counts.get(label) ?? 0)};
}

function countStackedSeries(
	labels: readonly string[],
	buckets: readonly string[],
	entries: readonly {readonly key: string; readonly bucket: string}[],
): StackedSeries {
	const bucketValues = new Map(buckets.map((bucket) => [bucket, Array.from({length: labels.length}, () => 0)]));
	const indexByLabel = new Map(labels.map((label, index) => [label, index]));
	for (const {key, bucket} of entries) {
		const values = bucketValues.get(bucket);
		const index = indexByLabel.get(key);
		if (values === undefined || index === undefined) {
			continue;
		}
		values[index] = (values[index] ?? 0) + 1;
	}
	return {labels: [...labels], datasets: buckets.map((bucket) => ({label: bucket, values: [...(bucketValues.get(bucket) ?? [])]}))};
}

function monthLabels(from: string, to: string): string[] {
	const start = parseDateText(from);
	const end = parseDateText(to);
	const result: string[] = [];
	for (
		let month = start.getUTCMonth(), year = start.getUTCFullYear();
		year < end.getUTCFullYear() || (year === end.getUTCFullYear() && month <= end.getUTCMonth());
		month++
	) {
		if (month > 11) {
			month = 0;
			year++;
		}
		result.push(`${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`);
	}
	return result;
}

export function aggregate(commits: readonly Commit[], range: DateRange): ReportData {
	parseDateText(range.from);
	parseDateText(range.to);
	if (range.from > range.to) {
		throw new Error('Report date range is reversed');
	}
	const selected = commits.filter((commit) => {
		const date = commit.date.slice(0, 10);
		return date >= range.from && date <= range.to;
	});

	const userCounts = new Map<string, number>();
	for (const commit of selected) {
		const author = commit.author === null || commit.author === '' ? '(no author)' : commit.author;
		userCounts.set(author, (userCounts.get(author) ?? 0) + 1);
	}
	const ranked = [...userCounts.entries()].sort(
		([leftName, leftCount], [rightName, rightCount]) => rightCount - leftCount || leftName.localeCompare(rightName),
	);
	let userLabels: string[];
	let userValues: number[];
	const bucketOf = new Map<string, string>();
	if (ranked.length > DEFAULT_CONTRIBUTORS) {
		const top = ranked.slice(0, DEFAULT_CONTRIBUTORS);
		const others = ranked.slice(DEFAULT_CONTRIBUTORS).reduce((sum, [, count]) => sum + count, 0);
		userLabels = [...top.map(([name]) => name), OTHER_CONTRIBUTORS_LABEL];
		userValues = [...top.map(([, count]) => count), others];
		for (const [name] of top) {
			bucketOf.set(name, name);
		}
		for (const [name] of ranked.slice(DEFAULT_CONTRIBUTORS)) {
			bucketOf.set(name, OTHER_CONTRIBUTORS_LABEL);
		}
	} else {
		userLabels = ranked.map(([name]) => name);
		userValues = ranked.map(([, count]) => count);
		for (const [name] of ranked) {
			bucketOf.set(name, name);
		}
	}
	const weekdayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const hourLabels = Array.from({length: 24}, (_, hour) => hour.toString().padStart(2, '0'));
	const dayLabels = Array.from({length: RECENT_DAYS}, (_, index) => addDays(range.to, index - (RECENT_DAYS - 1)));
	const monthLabelsList = monthLabels(range.from, range.to);
	const recentFrom = addDays(range.to, 1 - RECENT_DAYS) > range.from ? addDays(range.to, 1 - RECENT_DAYS) : range.from;
	const recentRange: DateRange = {from: recentFrom, to: range.to};
	const recent = selected.filter((commit) => commit.date.slice(0, 10) >= recentFrom).sort((left, right) => right.revision - left.revision);
	const daysByUser = countStackedSeries(
		dayLabels,
		userLabels,
		selected.map((commit) => {
			const author = commit.author === null || commit.author === '' ? '(no author)' : commit.author;
			return {key: commit.date.slice(0, 10), bucket: bucketOf.get(author) ?? OTHER_CONTRIBUTORS_LABEL};
		}),
	);
	return {
		range,
		recentRange,
		total: selected.length,
		users: {labels: userLabels, values: userValues},
		weekdays: countSeries(
			weekdayLabels,
			selected.map((commit) => weekdayLabels[(new Date(commit.date).getUTCDay() + 6) % 7] ?? 'Monday'),
		),
		hours: countSeries(
			hourLabels,
			selected.map((commit) => new Date(commit.date).getUTCHours().toString().padStart(2, '0')),
		),
		days: countSeries(
			dayLabels,
			selected.map((commit) => commit.date.slice(0, 10)),
		),
		daysByUser,
		months: countSeries(
			monthLabelsList,
			selected.map((commit) => commit.date.slice(0, 7)),
		),
		recent,
	};
}
