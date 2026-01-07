import {readFile, writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {type Commit} from './parser.ts';

/**
 * Serialized data schema
 */
const SerializedDataSchema = z.object({
	commits: z.array(
		z.object({
			revision: z.number(),
			author: z.string(),
			date: z.string(),
			message: z.string(),
		}),
	),
	dateRange: z.object({
		start: z.string(),
		end: z.string(),
	}),
});

/**
 * Serialized data type
 */
export type SerializedData = {
	commits: Commit[];
	dateRange: {
		start: Date;
		end: Date;
	};
};

/**
 * Serialize commits and date range to JSON file
 */
export async function serializeData(commits: Commit[], dateRange: {start: Date; end: Date}, filePath: string): Promise<void> {
	const serialized = {
		commits: commits.map((c) => ({
			...c,
			date: c.date.toISOString(),
		})),
		dateRange: {
			start: dateRange.start.toISOString(),
			end: dateRange.end.toISOString(),
		},
	};

	await writeFile(filePath, JSON.stringify(serialized, null, '\t'), 'utf8');
}

/**
 * Deserialize commits and date range from JSON file
 */
export async function deserializeData(filePath: string): Promise<SerializedData> {
	const raw = await readFile(filePath, 'utf8');
	const parsed = JSON.parse(raw) as unknown;

	const result = SerializedDataSchema.safeParse(parsed);
	if (!result.success) {
		throw new Error(`Invalid data file format: ${result.error.message}`);
	}

	return {
		commits: result.data.commits.map((c) => ({
			...c,
			date: new Date(c.date),
		})),
		dateRange: {
			start: new Date(result.data.dateRange.start),
			end: new Date(result.data.dateRange.end),
		},
	};
}
