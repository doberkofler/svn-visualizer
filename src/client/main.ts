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
		backgroundColor: string | string[];
		borderColor?: string;
	}[];
};

/**
 * Chart data from JSON script tag
 */
type ChartDataCollection = {
	last30DaysData: ChartData;
	last12MonthsData: ChartData;
	userTotalsData: ChartData;
	byWeekdayData: ChartData;
	byHourData: ChartData;
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
					display: false,
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
 * Create pie chart
 */
function createPieChart(canvasId: string, data: ChartData, title: string): void {
	const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
	if (canvas === null) {
		throw new Error(`Canvas element ${canvasId} not found`);
	}

	new Chart(canvas, {
		type: 'pie',
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
					display: true,
					position: 'right',
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

	createBarChart('chart-last-30-days', data.last30DaysData, 'Commits per Day (Last 30 Days)');
	createBarChart('chart-last-12-months', data.last12MonthsData, 'Commits per Month (Last 12 Months)');
	createPieChart('chart-user-totals', data.userTotalsData, 'Commits by User');
	createBarChart('chart-by-weekday', data.byWeekdayData, 'Commits by Weekday');
	createBarChart('chart-by-hour', data.byHourData, 'Commits by Hour of Day');
}

// Initialize charts when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		initCharts();
	});
} else {
	initCharts();
}
