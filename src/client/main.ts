import {Chart, registerables} from 'chart.js';

Chart.register(...registerables);

/**
 * Chart data structure
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
 * Chart data from JSON script tag
 */
type ChartDataCollection = {
	dailyData: ChartData;
	weeklyData: ChartData;
	monthlyData: ChartData;
	userDailyData: ChartData;
	userWeeklyData: ChartData;
	userMonthlyData: ChartData;
};

/**
 * Create bar chart
 */
function createBarChart(canvasId: string, data: ChartData, title: string): void {
	const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
	if (canvas === null) {
		throw new Error(`Canvas element ${canvasId} not found`);
	}

	new Chart(canvas, {
		type: 'bar',
		data,
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				title: {
					display: true,
					text: title,
					font: {size: 20},
				},
				legend: {
					display: data.datasets.length > 1,
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						precision: 0,
					},
				},
			},
		},
	});
}

/**
 * Load chart data from JSON script tag
 */
function loadChartData(): ChartDataCollection {
	const scriptElement = document.getElementById('chart-data');
	if (scriptElement === null) {
		throw new Error('Chart data script element not found');
	}

	const jsonText = scriptElement.textContent;
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (jsonText === null) {
		throw new Error('Chart data script element is empty');
	}

	return JSON.parse(jsonText) as ChartDataCollection;
}

/**
 * Initialize all charts
 */
function initCharts(): void {
	const data = loadChartData();

	createBarChart('chart-daily', data.dailyData, 'Commits per Day');
	createBarChart('chart-weekly', data.weeklyData, 'Commits per Week');
	createBarChart('chart-monthly', data.monthlyData, 'Commits per Month');
	createBarChart('chart-user-daily', data.userDailyData, 'Commits per User (Daily)');
	createBarChart('chart-user-weekly', data.userWeeklyData, 'Commits per User (Weekly)');
	createBarChart('chart-user-monthly', data.userMonthlyData, 'Commits per User (Monthly)');
}

// Initialize charts when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		initCharts();
	});
} else {
	initCharts();
}
