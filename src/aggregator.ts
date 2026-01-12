import {type Commit} from './parser.ts';

/**
 * Aggregated commit data
 */
export type AggregatedData = {
	daily: Map<string, number>;
	weekly: Map<string, number>;
	monthly: Map<string, number>;
	userDaily: Map<string, Map<string, number>>;
	userWeekly: Map<string, Map<string, number>>;
	userMonthly: Map<string, Map<string, number>>;
	dateRange: {start: Date; end: Date};
};

/**
 * Get ISO week number (Monday = start of week)
 */
function getIsoWeek(date: Date): {year: number; week: number} {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	d.setDate(d.getDate() + 4 - (d.getDay() || 7));
	const yearStart = new Date(d.getFullYear(), 0, 1);
	const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return {year: d.getFullYear(), week: weekNo};
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDay(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Format week as YYYY-Wxx
 */
function formatWeek(date: Date): string {
	const {year, week} = getIsoWeek(date);
	return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Format month as YYYY-MM
 */
function formatMonth(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}

/**
 * Aggregate commits by time period and user
 */
export function aggregateCommits(commits: Commit[], startDate: Date, endDate: Date): AggregatedData {
	const daily = new Map<string, number>();
	const weekly = new Map<string, number>();
	const monthly = new Map<string, number>();
	const userDaily = new Map<string, Map<string, number>>();
	const userWeekly = new Map<string, Map<string, number>>();
	const userMonthly = new Map<string, Map<string, number>>();

	// Normalize start date to beginning of day
	const normalizedStart = new Date(startDate);
	normalizedStart.setHours(0, 0, 0, 0);

	// Normalize end date to end of day
	const normalizedEnd = new Date(endDate);
	normalizedEnd.setHours(23, 59, 59, 999);

	// Initialize all periods with 0
	const current = new Date(normalizedStart);
	while (current <= normalizedEnd) {
		daily.set(formatDay(current), 0);
		weekly.set(formatWeek(current), 0);
		monthly.set(formatMonth(current), 0);
		current.setDate(current.getDate() + 1);
	}

	// Filter and aggregate commits within date range
	const filteredCommits = commits.filter((c) => c.date >= normalizedStart && c.date <= normalizedEnd);

	for (const commit of filteredCommits) {
		const day = formatDay(commit.date);
		const week = formatWeek(commit.date);
		const month = formatMonth(commit.date);

		// Total counts
		daily.set(day, (daily.get(day) ?? 0) + 1);
		weekly.set(week, (weekly.get(week) ?? 0) + 1);
		monthly.set(month, (monthly.get(month) ?? 0) + 1);

		// User counts
		if (!userDaily.has(commit.author)) {
			userDaily.set(commit.author, new Map<string, number>());
		}
		if (!userWeekly.has(commit.author)) {
			userWeekly.set(commit.author, new Map<string, number>());
		}
		if (!userMonthly.has(commit.author)) {
			userMonthly.set(commit.author, new Map<string, number>());
		}

		const authorDaily = userDaily.get(commit.author);
		const authorWeekly = userWeekly.get(commit.author);
		const authorMonthly = userMonthly.get(commit.author);

		if (authorDaily === undefined || authorWeekly === undefined || authorMonthly === undefined) {
			throw new Error(`Failed to initialize user maps for ${commit.author}`);
		}

		authorDaily.set(day, (authorDaily.get(day) ?? 0) + 1);
		authorWeekly.set(week, (authorWeekly.get(week) ?? 0) + 1);
		authorMonthly.set(month, (authorMonthly.get(month) ?? 0) + 1);
	}

	return {
		daily,
		weekly,
		monthly,
		userDaily,
		userWeekly,
		userMonthly,
		dateRange: {start: normalizedStart, end: normalizedEnd},
	};
}
