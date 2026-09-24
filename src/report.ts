import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {aggregate, resolveRange, type ReportData} from './aggregation.js';
import {readData} from './store.js';

const generateOptionsSchema = z.object({
	dataFile: z.string().min(1),
	outputDir: z.string().min(1),
	from: z.string().optional(),
	to: z.string().optional(),
	relativeDays: z.number().int().positive().optional(),
	title: z.string().min(1).default('Subversion activity'),
});

export type GenerateOptions = z.input<typeof generateOptionsSchema>;

type PageData = ReportData & {
	readonly title: string;
	readonly sourceUrl: string;
	readonly generatedAt: string;
};

export function escapeHtml(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function safeJson(value: unknown): string {
	return JSON.stringify(value)
		.replaceAll('&', String.raw`\u0026`)
		.replaceAll('<', String.raw`\u003c`)
		.replaceAll('>', String.raw`\u003e`)
		.replaceAll('\u2028', String.raw`\u2028`)
		.replaceAll('\u2029', String.raw`\u2029`);
}

export function renderHtml(data: PageData, clientScript: string): string {
	const title = escapeHtml(data.title);
	const source = escapeHtml(data.sourceUrl);
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width,initial-scale=1">
	<title>${title}</title>
	<style>
		:root{color-scheme:dark;--ink:#f4efe4;--muted:#aaa69d;--panel:#18201f;--line:#34413e;--accent:#f3b33d;--cool:#6dc8bf}*{box-sizing:border-box}body{margin:0;background:#0c1110;color:var(--ink);font:16px/1.5 Inter,ui-sans-serif,system-ui,sans-serif}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 80% 0,#24423b 0,transparent 38%),linear-gradient(120deg,transparent 0 48%,#ffffff05 48% 49%,transparent 49%);z-index:-1}.wrap{width:min(1180px,calc(100% - 32px));margin:auto;padding:56px 0 72px}header{border-left:5px solid var(--accent);padding-left:24px;margin-bottom:36px}h1{font-family:Georgia,serif;font-size:clamp(2.25rem,6vw,5rem);font-weight:500;line-height:.95;letter-spacing:-.045em;margin:0 0 20px}.eyebrow{color:var(--accent);font-size:.75rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.meta{display:flex;flex-wrap:wrap;gap:8px 24px;color:var(--muted);font-size:.875rem}.meta a{color:var(--cool);overflow-wrap:anywhere}.total{display:grid;grid-template-columns:auto 1fr;align-items:end;gap:18px;margin:28px 0}.total strong{font:500 clamp(4rem,14vw,9rem)/.8 Georgia,serif;color:var(--accent)}.total span{max-width:12rem;color:var(--muted);text-transform:uppercase;letter-spacing:.12em;font-weight:700}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{min-width:0;background:color-mix(in srgb,var(--panel) 94%,transparent);border:1px solid var(--line);border-radius:4px;padding:22px;box-shadow:0 16px 42px #0003}.card.wide{grid-column:1/-1}.card h2{font:500 1.25rem Georgia,serif;margin:0 0 18px}.chart{position:relative;height:280px}.wide .chart{height:330px}table.commits{width:100%;border-collapse:collapse;font-size:.875rem}table.commits th,table.commits td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}table.commits th{color:var(--muted);font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}table.commits td.rev{color:var(--accent);font-variant-numeric:tabular-nums;white-space:nowrap}table.commits td.date{white-space:nowrap;color:var(--muted)}table.commits .msg{overflow-wrap:anywhere}table.commits tbody tr:last-child td{border-bottom:none}footer{color:var(--muted);font-size:.75rem;margin-top:24px;text-align:right}@media(max-width:720px){.wrap{padding-top:32px}.grid{grid-template-columns:1fr}.card.wide{grid-column:auto}.chart,.wide .chart{height:260px}}
	</style>
</head>
<body>
	<main class="wrap">
		<header><div class="eyebrow">Repository pulse / UTC</div><h1>${title}</h1><div class="meta"><span>${escapeHtml(data.range.from)} to ${escapeHtml(data.range.to)}</span><a href="${source}">${source}</a></div></header>
		<section class="total" aria-label="Commit total"><strong>${String(data.total)}</strong><span>commits in selected period</span></section>
		<section class="grid">
			<article class="card wide"><h2>Last 30 days</h2><div class="chart"><canvas id="days" role="img" aria-label="Commits per day">Chart: commits per day.</canvas></div></article>
			<article class="card wide"><h2>Commits per day and user</h2><div class="chart"><canvas id="days-by-user" role="img" aria-label="Commits per day and user">Chart: commits per day and user.</canvas></div></article>
			<article class="card wide"><h2>Current and previous 11 months</h2><div class="chart"><canvas id="months" role="img" aria-label="Commits per month">Chart: commits per month.</canvas></div></article>
			<article class="card"><h2>Contributors</h2><div class="chart"><canvas id="users" role="img" aria-label="Commits by contributor">Chart: commits by contributor.</canvas></div></article>
			<article class="card"><h2>Weekday</h2><div class="chart"><canvas id="weekdays" role="img" aria-label="Commits by weekday in UTC">Chart: commits by weekday in UTC.</canvas></div></article>
			<article class="card wide"><h2>Hour of day (UTC)</h2><div class="chart"><canvas id="hours" role="img" aria-label="Commits by hour in UTC">Chart: commits by hour in UTC.</canvas></div></article>
			<article class="card wide"><h2>Recent commits</h2><table class="commits"><thead><tr><th>Revision</th><th>Author</th><th>Date (UTC)</th><th>Message</th></tr></thead><tbody id="commits"></tbody></table></article>
		</section>
		<footer>Generated ${escapeHtml(data.generatedAt)} · All dates and times UTC</footer>
	</main>
	<script id="report-data" type="application/json">${safeJson(data)}</script>
	<script type="module">${clientScript.replaceAll('</script', String.raw`<\/script`)}</script>
</body>
</html>\n`;
}

export async function generate(rawOptions: GenerateOptions, clientScript?: string): Promise<string> {
	const options = generateOptionsSchema.parse(rawOptions);
	const data = await readData(options.dataFile);
	const range = resolveRange(data.commits, options);
	const reportData: PageData = {
		...aggregate(data.commits, range),
		title: options.title,
		sourceUrl: data.source.requestedUrl,
		generatedAt: new Date().toISOString(),
	};
	const clientUrl = new URL('client/main.js', import.meta.url);
	const script = clientScript ?? (await readFile(fileURLToPath(clientUrl), 'utf8'));
	const outputFile = path.resolve(options.outputDir, 'index.html');
	await mkdir(path.dirname(outputFile), {recursive: true});
	await writeFile(outputFile, renderHtml(reportData, script), 'utf8');
	return outputFile;
}
