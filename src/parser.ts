import {z} from 'zod';

/**
 * Commit schema
 */
const CommitSchema = z.object({
	revision: z.number().int().positive(),
	author: z.string(),
	date: z.date(),
	message: z.string(),
});

export type Commit = z.infer<typeof CommitSchema>;

/**
 * Parse SVN XML log output into structured commits
 */
export function parseCommits(xmlLog: string): Commit[] {
	const logentryRegex = /<logentry\s+revision="(\d+)">([\s\S]*?)<\/logentry>/g;
	const authorRegex = /<author>(.*?)<\/author>/;
	const dateRegex = /<date>(.*?)<\/date>/;
	const msgRegex = /<msg>([\s\S]*?)<\/msg>/;

	const commits: Commit[] = [];
	let match: RegExpExecArray | null;

	while ((match = logentryRegex.exec(xmlLog)) !== null) {
		const revisionStr = match[1];
		const content = match[2];

		if (revisionStr === undefined || content === undefined) {
			throw new Error('Failed to extract revision or content from logentry');
		}

		const authorMatch = authorRegex.exec(content);
		const dateMatch = dateRegex.exec(content);
		const msgMatch = msgRegex.exec(content);

		if (authorMatch === null || dateMatch === null) {
			throw new Error(`Missing author or date in revision ${revisionStr}`);
		}

		const author = authorMatch[1];
		const dateStr = dateMatch[1];
		const message = msgMatch?.[1] ?? '';

		if (author === undefined || dateStr === undefined) {
			throw new Error(`Invalid author or date in revision ${revisionStr}`);
		}

		const date = new Date(dateStr);
		if (isNaN(date.getTime())) {
			throw new Error(`Invalid date format in revision ${revisionStr}: ${dateStr}`);
		}

		const revision = parseInt(revisionStr, 10);
		if (isNaN(revision)) {
			throw new Error(`Invalid revision number: ${revisionStr}`);
		}

		const result = CommitSchema.safeParse({
			revision,
			author,
			date,
			message,
		});

		if (!result.success) {
			throw new Error(`Commit validation failed: ${result.error.message}`);
		}

		commits.push(result.data);
	}

	return commits;
}
