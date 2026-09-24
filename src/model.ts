import {z} from 'zod';

export const commitSchema = z
	.object({
		revision: z.number().int().positive(),
		author: z.string().nullable(),
		date: z.iso.datetime({offset: true}),
		message: z.string(),
	})
	.strict();

export const sourceSchema = z
	.object({
		requestedUrl: z.url(),
		root: z.url(),
		uuid: z.string().min(1),
	})
	.strict();

export const dataSchema = z
	.object({
		schemaVersion: z.literal(1),
		source: sourceSchema,
		lastRevision: z.number().int().nonnegative(),
		gatheredAt: z.iso.datetime({offset: true}),
		commits: z.array(commitSchema),
	})
	.strict();

export type Commit = z.infer<typeof commitSchema>;
export type DataSet = z.infer<typeof dataSchema>;
export type Source = z.infer<typeof sourceSchema>;
