import {type Commit} from './parser.ts';

/**
 * Aggregated commit data
 */
export type AggregatedData = {
	last30Days: Map<string, number>;
	last12Months: Map<string, number>;
	userTotals: Map<string, number>;
	byWeekday: Map<string, number>;
	byHour: Map<number, number>;
	dateRange: {start: Date; end: Date};
};

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
 * Format month as YYYY-MM
 */
function formatMonth(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}

/**
 * Get weekday name
 */
function getWeekdayName(date: Date): string {
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return days[date.getDay()] ?? 'Unknown';
}

/**
 * Aggregate commits by time period and user
 */
export function aggregateCommits(commits: Commit[], startDate: Date, endDate: Date): AggregatedData {
	// Normalize start date to beginning of day
	const normalizedStart = new Date(startDate);
	normalizedStart.setHours(0, 0, 0, 0);

	// Normalize end date to end of day
	const normalizedEnd = new Date(endDate);
	normalizedEnd.setHours(23, 59, 59, 999);

	// Filter commits within date range
	const filteredCommits = commits.filter((c) => c.date >= normalizedStart && c.date <= normalizedEnd);

	// Last 30 days
	const last30Days = new Map<string, number>();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	thirtyDaysAgo.setHours(0, 0, 0, 0);

	for (let i = 0; i < 30; i++) {
		const date = new Date(thirtyDaysAgo);
		date.setDate(date.getDate() + i);
		last30Days.set(formatDay(date), 0);
	}

	for (const commit of filteredCommits) {
		if (commit.date >= thirtyDaysAgo) {
			const day = formatDay(commit.date);
			last30Days.set(day, (last30Days.get(day) ?? 0) + 1);
		}
	}

	// Last 12 months
	const last12Months = new Map<string, number>();
	const twelveMonthsAgo = new Date();
	twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
	twelveMonthsAgo.setDate(1);
	twelveMonthsAgo.setHours(0, 0, 0, 0);

	for (let i = 0; i < 12; i++) {
		const date = new Date(twelveMonthsAgo);
		date.setMonth(date.getMonth() + i);
		last12Months.set(formatMonth(date), 0);
	}

	for (const commit of filteredCommits) {
		if (commit.date >= twelveMonthsAgo) {
			const month = formatMonth(commit.date);
			last12Months.set(month, (last12Months.get(month) ?? 0) + 1);
		}
	}

	// User totals
	const userTotals = new Map<string, number>();
	for (const commit of filteredCommits) {
		userTotals.set(commit.author, (userTotals.get(commit.author) ?? 0) + 1);
	}

	// By weekday
	const byWeekday = new Map<string, number>([
		['Monday', 0],
		['Tuesday', 0],
		['Wednesday', 0],
		['Thursday', 0],
		['Friday', 0],
		['Saturday', 0],
		['Sunday', 0],
	]);

	for (const commit of filteredCommits) {
		const weekday = getWeekdayName(commit.date);
		byWeekday.set(weekday, (byWeekday.get(weekday) ?? 0) + 1);
	}

	// By hour
	const byHour = new Map<number, number>();
	for (let i = 0; i < 24; i++) {
		byHour.set(i, 0);
	}

	for (const commit of filteredCommits) {
		const hour = commit.date.getHours();
		byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
	}

	return {
		last30Days,
		last12Months,
		userTotals,
		byWeekday,
		byHour,
		dateRange: {start: normalizedStart, end: normalizedEnd},
	};
}
