/**
 * SVG bar chart parameters
 */
export type BarChartParams = {
	title: string;
	data: Map<string, number>;
	width: number;
	height: number;
	color: string;
};

/**
 * Generate SVG bar chart
 */
export function generateBarChart(params: BarChartParams): string {
	const {title, data, width, height, color} = params;
	const margin = {top: 60, right: 40, bottom: 80, left: 60};
	const chartWidth = width - margin.left - margin.right;
	const chartHeight = height - margin.top - margin.bottom;

	const entries = Array.from(data.entries());
	const maxValue = Math.max(...entries.map(([, v]) => v), 1);
	const barWidth = chartWidth / entries.length;

	const bars = entries
		.map(([label, value], i) => {
			const barHeight = (value / maxValue) * chartHeight;
			const x = margin.left + i * barWidth;
			const y = margin.top + chartHeight - barHeight;

			const labelX = x + barWidth / 2;
			const labelY = margin.top + chartHeight + 20;

			return `
				<rect x="${x}" y="${y}" width="${barWidth * 0.8}" height="${barHeight}" fill="${color}" />
				<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="10" transform="rotate(45 ${labelX} ${labelY})">${label}</text>
				<text x="${labelX}" y="${y - 5}" text-anchor="middle" font-size="12">${value}</text>
			`;
		})
		.join('');

	return `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<rect width="${width}" height="${height}" fill="white"/>
			<text x="${width / 2}" y="30" text-anchor="middle" font-size="20" font-weight="bold">${title}</text>
			<line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="black" stroke-width="2"/>
			<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="black" stroke-width="2"/>
			${bars}
		</svg>
	`;
}

/**
 * SVG grouped bar chart parameters
 */
export type GroupedBarChartParams = {
	title: string;
	data: Map<string, Map<string, number>>;
	width: number;
	height: number;
	colors: string[];
};

/**
 * Generate SVG grouped bar chart (for per-user data)
 */
export function generateGroupedBarChart(params: GroupedBarChartParams): string {
	const {title, data, width, height, colors} = params;
	const margin = {top: 80, right: 40, bottom: 80, left: 60};
	const chartWidth = width - margin.left - margin.right;
	const chartHeight = height - margin.top - margin.bottom;

	const users = Array.from(data.keys());
	const allPeriods = new Set<string>();
	for (const userMap of data.values()) {
		for (const period of userMap.keys()) {
			allPeriods.add(period);
		}
	}
	const periods = Array.from(allPeriods).sort();

	const maxValue = Math.max(...Array.from(data.values()).flatMap((m) => Array.from(m.values())), 1);

	const groupWidth = chartWidth / periods.length;
	const barWidth = groupWidth / users.length;

	const bars = periods
		.map((period, periodIdx) => {
			return users
				.map((user, userIdx) => {
					const value = data.get(user)?.get(period) ?? 0;
					const barHeight = (value / maxValue) * chartHeight;
					const x = margin.left + periodIdx * groupWidth + userIdx * barWidth;
					const y = margin.top + chartHeight - barHeight;
					const color = colors[userIdx % colors.length];

					if (color === undefined) {
						throw new Error(`No color available for user index ${userIdx}`);
					}

					return `
						<rect x="${x}" y="${y}" width="${barWidth * 0.9}" height="${barHeight}" fill="${color}" />
						${value > 0 ? `<text x="${x + (barWidth * 0.9) / 2}" y="${y - 5}" text-anchor="middle" font-size="10">${value}</text>` : ''}
					`;
				})
				.join('');
		})
		.join('');

	const xLabels = periods
		.map((period, i) => {
			const x = margin.left + i * groupWidth + groupWidth / 2;
			const y = margin.top + chartHeight + 20;
			return `<text x="${x}" y="${y}" text-anchor="middle" font-size="10" transform="rotate(45 ${x} ${y})">${period}</text>`;
		})
		.join('');

	const legend = users
		.map((user, i) => {
			const color = colors[i % colors.length];
			if (color === undefined) {
				throw new Error(`No color available for user index ${i}`);
			}
			const x = margin.left + i * 150;
			const y = 40;
			return `
				<rect x="${x}" y="${y}" width="20" height="20" fill="${color}" />
				<text x="${x + 25}" y="${y + 15}" font-size="12">${user}</text>
			`;
		})
		.join('');

	return `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<rect width="${width}" height="${height}" fill="white"/>
			<text x="${width / 2}" y="25" text-anchor="middle" font-size="20" font-weight="bold">${title}</text>
			${legend}
			<line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="black" stroke-width="2"/>
			<line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="black" stroke-width="2"/>
			${bars}
			${xLabels}
		</svg>
	`;
}
