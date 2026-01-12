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
		backgroundColor: string;
		borderColor?: string;
	}[];
};

/**
 * Generate chart data objects
 */
function generateChartData(data: AggregatedData): {
	dailyData: ChartData;
	weeklyData: ChartData;
	monthlyData: ChartData;
	userDailyData: ChartData;
	userWeeklyData: ChartData;
	userMonthlyData: ChartData;
} {
	const colors = ['#F44336', '#9C27B0', '#3F51B5', '#009688', '#FFEB3B', '#795548', '#607D8B'];

	// Daily data
	const dailyLabels = Array.from(data.daily.keys()).sort();
	const dailyValues = dailyLabels.map((label) => data.daily.get(label) ?? 0);
	const dailyData: ChartData = {
		labels: dailyLabels,
		datasets: [
			{
				label: 'Commits',
				data: dailyValues,
				backgroundColor: '#4CAF50',
			},
		],
	};

	// Weekly data
	const weeklyLabels = Array.from(data.weekly.keys()).sort();
	const weeklyValues = weeklyLabels.map((label) => data.weekly.get(label) ?? 0);
	const weeklyData: ChartData = {
		labels: weeklyLabels,
		datasets: [
			{
				label: 'Commits',
				data: weeklyValues,
				backgroundColor: '#2196F3',
			},
		],
	};

	// Monthly data
	const monthlyLabels = Array.from(data.monthly.keys()).sort();
	const monthlyValues = monthlyLabels.map((label) => data.monthly.get(label) ?? 0);
	const monthlyData: ChartData = {
		labels: monthlyLabels,
		datasets: [
			{
				label: 'Commits',
				data: monthlyValues,
				backgroundColor: '#FF9800',
			},
		],
	};

	// User daily data
	const userDailyLabels = new Set<string>();
	for (const userMap of data.userDaily.values()) {
		for (const period of userMap.keys()) {
			userDailyLabels.add(period);
		}
	}
	const userDailyLabelsSorted = Array.from(userDailyLabels).sort();
	const users = Array.from(data.userDaily.keys());
	const userDailyData: ChartData = {
		labels: userDailyLabelsSorted,
		datasets: users.map((user, idx) => {
			const userMap = data.userDaily.get(user);
			if (userMap === undefined) {
				throw new Error(`User map not found for ${user}`);
			}
			return {
				label: user,
				data: userDailyLabelsSorted.map((label) => userMap.get(label) ?? 0),
				backgroundColor: colors[idx % colors.length] ?? '#000000',
			};
		}),
	};

	// User weekly data
	const userWeeklyLabels = new Set<string>();
	for (const userMap of data.userWeekly.values()) {
		for (const period of userMap.keys()) {
			userWeeklyLabels.add(period);
		}
	}
	const userWeeklyLabelsSorted = Array.from(userWeeklyLabels).sort();
	const userWeeklyData: ChartData = {
		labels: userWeeklyLabelsSorted,
		datasets: users.map((user, idx) => {
			const userMap = data.userWeekly.get(user);
			if (userMap === undefined) {
				throw new Error(`User map not found for ${user}`);
			}
			return {
				label: user,
				data: userWeeklyLabelsSorted.map((label) => userMap.get(label) ?? 0),
				backgroundColor: colors[idx % colors.length] ?? '#000000',
			};
		}),
	};

	// User monthly data
	const userMonthlyLabels = new Set<string>();
	for (const userMap of data.userMonthly.values()) {
		for (const period of userMap.keys()) {
			userMonthlyLabels.add(period);
		}
	}
	const userMonthlyLabelsSorted = Array.from(userMonthlyLabels).sort();
	const userMonthlyData: ChartData = {
		labels: userMonthlyLabelsSorted,
		datasets: users.map((user, idx) => {
			const userMap = data.userMonthly.get(user);
			if (userMap === undefined) {
				throw new Error(`User map not found for ${user}`);
			}
			return {
				label: user,
				data: userMonthlyLabelsSorted.map((label) => userMap.get(label) ?? 0),
				backgroundColor: colors[idx % colors.length] ?? '#000000',
			};
		}),
	};

	return {
		dailyData,
		weeklyData,
		monthlyData,
		userDailyData,
		userWeeklyData,
		userMonthlyData,
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
	</style>
</head>
<body>
	<h1>SVN Repository Statistics</h1>
	<div class="subtitle">${startStr} to ${endStr}</div>
	
	<div class="chart">
		<canvas id="chart-daily"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-weekly"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-monthly"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-user-daily"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-user-weekly"></canvas>
	</div>
	
	<div class="chart">
		<canvas id="chart-user-monthly"></canvas>
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
