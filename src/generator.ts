import {writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {type AggregatedData} from './aggregator.ts';
import {generateBarChart, generateGroupedBarChart} from './svg.ts';

/**
 * Generate HTML page with embedded SVG charts
 */
export async function generateHtml(data: AggregatedData, outputDir: string): Promise<void> {
	await mkdir(outputDir, {recursive: true});

	const dailyChart = generateBarChart({
		title: 'Commits per Day',
		data: data.daily,
		width: 1200,
		height: 600,
		color: '#4CAF50',
	});

	const weeklyChart = generateBarChart({
		title: 'Commits per Week',
		data: data.weekly,
		width: 1200,
		height: 600,
		color: '#2196F3',
	});

	const monthlyChart = generateBarChart({
		title: 'Commits per Month',
		data: data.monthly,
		width: 1200,
		height: 600,
		color: '#FF9800',
	});

	const colors = ['#F44336', '#9C27B0', '#3F51B5', '#009688', '#FFEB3B', '#795548', '#607D8B'];

	const userDailyChart = generateGroupedBarChart({
		title: 'Commits per User (Daily)',
		data: data.userDaily,
		width: 1400,
		height: 700,
		colors,
	});

	const userWeeklyChart = generateGroupedBarChart({
		title: 'Commits per User (Weekly)',
		data: data.userWeekly,
		width: 1400,
		height: 700,
		colors,
	});

	const userMonthlyChart = generateGroupedBarChart({
		title: 'Commits per User (Monthly)',
		data: data.userMonthly,
		width: 1400,
		height: 700,
		colors,
	});

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>SVN Repository Statistics</title>
	<style>
		body {
			font-family: system-ui, -apple-system, sans-serif;
			margin: 0;
			padding: 20px;
			background: #f5f5f5;
		}
		h1 {
			text-align: center;
			color: #333;
		}
		.chart {
			background: white;
			margin: 20px auto;
			padding: 20px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			max-width: 1440px;
		}
	</style>
</head>
<body>
	<h1>SVN Repository Statistics</h1>
	<div class="chart">${dailyChart}</div>
	<div class="chart">${weeklyChart}</div>
	<div class="chart">${monthlyChart}</div>
	<div class="chart">${userDailyChart}</div>
	<div class="chart">${userWeeklyChart}</div>
	<div class="chart">${userMonthlyChart}</div>
</body>
</html>`;

	await writeFile(join(outputDir, 'index.html'), html, 'utf8');
}
