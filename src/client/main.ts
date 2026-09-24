import Chart from 'chart.js/auto';

type Series = {readonly labels: string[]; readonly values: number[]};
type StackedSeries = {readonly labels: string[]; readonly datasets: readonly {readonly label: string; readonly values: number[]}[]};
type RecentCommit = {readonly revision: number; readonly author: string | null; readonly date: string; readonly message: string};
type BrowserData = {
	readonly days: Series;
	readonly daysByUser: StackedSeries;
	readonly months: Series;
	readonly users: Series;
	readonly weekdays: Series;
	readonly hours: Series;
	readonly recent: RecentCommit[];
};

const element = document.querySelector('#report-data');
const reportText = element?.textContent;
if (reportText === undefined) {
	throw new Error('Report data is missing');
}
const data = JSON.parse(reportText) as BrowserData;
const charts: Chart[] = [];
const accent = '#f3b33d';
const cool = '#6dc8bf';
const common = {
	responsive: true,
	maintainAspectRatio: false,
	plugins: {legend: {display: false}},
	scales: {
		x: {ticks: {color: '#aaa69d'}, grid: {color: '#34413e'}},
		y: {beginAtZero: true, ticks: {color: '#aaa69d', precision: 0}, grid: {color: '#34413e'}},
	},
} as const;

function chart(id: string, series: Series, type: 'bar' | 'line', color: string): void {
	const canvas = document.querySelector<HTMLCanvasElement>(`#${id}`);
	if (canvas === null) {
		return;
	}
	charts.push(
		new Chart(canvas, {
			type,
			data: {
				labels: series.labels,
				datasets: [{data: series.values, borderColor: color, backgroundColor: `${color}99`, fill: type === 'line', tension: 0.25}],
			},
			options: common,
		}),
	);
}

const palette = [accent, cool, '#f77f00', '#90be6d', '#9b5de5', '#f94144', '#577590', '#43aa8b', '#f9844a', '#277da1'];

function stackedChart(id: string, series: StackedSeries): void {
	const canvas = document.querySelector<HTMLCanvasElement>(`#${id}`);
	if (canvas === null) {
		return;
	}
	charts.push(
		new Chart(canvas, {
			type: 'bar',
			data: {
				labels: series.labels,
				datasets: series.datasets.map((dataset, index) => ({
					label: dataset.label,
					data: dataset.values,
					backgroundColor: `${palette[index % palette.length] ?? accent}99`,
					borderColor: palette[index % palette.length] ?? accent,
				})),
			},
			options: {
				...common,
				plugins: {legend: {display: true, position: 'bottom', labels: {color: '#aaa69d'}}},
				scales: {
					x: {...common.scales.x, stacked: true},
					y: {...common.scales.y, stacked: true},
				},
			},
		}),
	);
}

chart('days', data.days, 'line', accent);
stackedChart('days-by-user', data.daysByUser);
chart('months', data.months, 'bar', cool);
chart('users', data.users, 'bar', accent);
chart('weekdays', data.weekdays, 'bar', cool);
chart('hours', data.hours, 'bar', accent);

function formatUtc(value: string): string {
	return new Date(value).toISOString().slice(0, 16).replace('T', ' ');
}

function renderCommits(commits: readonly RecentCommit[]): void {
	const tbody = document.querySelector<HTMLTableSectionElement>('#commits');
	if (tbody === null) {
		return;
	}
	for (const commit of commits) {
		const row = document.createElement('tr');
		const revision = document.createElement('td');
		revision.textContent = String(commit.revision);
		revision.className = 'rev';
		const author = document.createElement('td');
		author.textContent = commit.author ?? '(no author)';
		const date = document.createElement('td');
		date.textContent = formatUtc(commit.date);
		date.className = 'date';
		const message = document.createElement('td');
		message.textContent = commit.message;
		message.className = 'msg';
		row.append(revision, author, date, message);
		tbody.append(row);
	}
}

renderCommits(data.recent);
