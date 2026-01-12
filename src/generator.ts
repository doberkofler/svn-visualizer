import {writeFile, mkdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {existsSync} from 'node:fs';
import {type AggregatedData} from './aggregator.ts';

/**
 * Generate chart data structure
 */
type ChartData = {
	labels: string[];
	datasets: {
		label: string;
		data: number[];
		backgroundColor: string | string[];
		borderColor?: string;
	}[];
};

/**
 * Generate chart data objects
 */
function generateChartData(data: AggregatedData): {
	last30DaysData: ChartData;
	last12MonthsData: ChartData;
	userTotalsData: ChartData;
	byWeekdayData: ChartData;
	byHourData: ChartData;
} {
	const colors = ['#F44336', '#9C27B0', '#3F51B5', '#009688', '#FFEB3B', '#795548', '#607D8B'];

	// Last 30 days
	const last30DaysLabels = Array.from(data.last30Days.keys()).sort();
	const last30DaysValues = last30DaysLabels.map((label) => data.last30Days.get(label) ?? 0);
	const last30DaysData: ChartData = {
		labels: last30DaysLabels,
		datasets: [
			{
				label: 'Commits',
				data: last30DaysValues,
				backgroundColor: '#4CAF50',
			},
		],
	};

	// Last 12 months
	const last12MonthsLabels = Array.from(data.last12Months.keys()).sort();
	const last12MonthsValues = last12MonthsLabels.map((label) => data.last12Months.get(label) ?? 0);
	const last12MonthsData: ChartData = {
		labels: last12MonthsLabels,
		datasets: [
			{
				label: 'Commits',
				data: last12MonthsValues,
				backgroundColor: '#2196F3',
			},
		],
	};

	// User totals (pie chart)
	const userLabels = Array.from(data.userTotals.keys());
	const userValues = userLabels.map((label) => data.userTotals.get(label) ?? 0);
	const userColors = userLabels.map((_, idx) => colors[idx % colors.length] ?? '#000000');
	const userTotalsData: ChartData = {
		labels: userLabels,
		datasets: [
			{
				label: 'Commits',
				data: userValues,
				backgroundColor: userColors,
			},
		],
	};

	// By weekday
	const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
	const weekdayValues = weekdayOrder.map((day) => data.byWeekday.get(day) ?? 0);
	const byWeekdayData: ChartData = {
		labels: weekdayOrder,
		datasets: [
			{
				label: 'Commits',
				data: weekdayValues,
				backgroundColor: '#FF9800',
			},
		],
	};

	// By hour
	const hourLabels = Array.from(data.byHour.keys())
		.sort((a, b) => a - b)
		.map((h) => `${String(h).padStart(2, '0')}:00`);
	const hourValues = Array.from(data.byHour.keys())
		.sort((a, b) => a - b)
		.map((h) => data.byHour.get(h) ?? 0);
	const byHourData: ChartData = {
		labels: hourLabels,
		datasets: [
			{
				label: 'Commits',
				data: hourValues,
				backgroundColor: '#9C27B0',
			},
		],
	};

	return {
		last30DaysData,
		last12MonthsData,
		userTotalsData,
		byWeekdayData,
		byHourData,
	};
}

/**
 * Generate HTML page with Chart.js charts
 */
export async function generateHtml(data: AggregatedData, outputDir: string): Promise<void> {
	await mkdir(outputDir, {recursive: true});

	const dateRange = data.dateRange;
	const startStr = dateRange.start.toISOString().split('T')[0];
	const endStr = dateRange.end.toISOString().split('T')[0];

	// Generate chart data
	const chartData = generateChartData(data);

	// Copy built client JS
	const clientJsPath = 'dist/client/main.js';
	if (!existsSync(clientJsPath)) {
		throw new Error('Client JS not found. Run "npm run build:client" first to build the client code.');
	}
	const clientJsCode = await readFile(clientJsPath, 'utf8');

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
		.subtitle {
			text-align: center;
			color: #666;
			margin-bottom: 30px;
		}
		.chart {
			background: white;
			margin: 20px auto;
			padding: 20px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			max-width: 1440px;
			height: 500px;
		}
		.chart.pie {
			height: 600px;
		}
	</style>
</head>
<body>
	<h1>SVN Repository Statistics</h1>
	<div class="subtitle">${startStr} to ${endStr}</div>
	
	<div class="chart">
		<canvas id="chart-last-30-days"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-last-12-months"></canvas>
	</div>
	
	<div class="chart pie">
		<canvas id="chart-user-totals"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-by-weekday"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-by-hour"></canvas>
	</div>
	
	<script id="chart-data" type="application/json">
${JSON.stringify(chartData)}
	</script>
	<script type="module">
${clientJsCode}
	</script>
</body>
</html>`;

	await writeFile(join(outputDir, 'index.html'), html, 'utf8');
}
