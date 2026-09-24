import {XMLParser} from 'fast-xml-parser';
import {SyntaxValidator} from 'fast-xml-validator';
import {z} from 'zod';
import {commitSchema, sourceSchema, type Commit, type Source} from './model.js';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	parseTagValue: false,
	trimValues: false,
	isArray: (_name, path): boolean => path === 'log.logentry',
});

const infoXmlSchema = z.object({
	info: z.object({
		entry: z.object({
			'@_revision': z.coerce.number().int().nonnegative(),
			repository: z.object({root: z.string().min(1), uuid: z.string().min(1)}),
		}),
	}),
});

const logContentsSchema = z.object({
	logentry: z
		.array(
			z.object({
				'@_revision': z.coerce.number().int().positive(),
				author: z.union([z.string(), z.record(z.string(), z.never())]).optional(),
				date: z.string(),
				msg: z.union([z.string(), z.record(z.string(), z.never())]).optional(),
			}),
		)
		.default([]),
});

const logXmlSchema = z.object({log: z.union([logContentsSchema, z.literal('')])});

function parseXml(xml: string): unknown {
	try {
		SyntaxValidator.validate(xml);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Invalid SVN XML: ${message}`, {cause: error});
	}
	return parser.parse(xml) as unknown;
}

function text(value: string | Record<string, never> | undefined): string {
	return typeof value === 'string' ? value : '';
}

export function parseInfoXml(xml: string, requestedUrl: string): Source {
	const parsed = infoXmlSchema.parse(parseXml(xml));
	return sourceSchema.parse({
		requestedUrl,
		root: parsed.info.entry.repository.root,
		uuid: parsed.info.entry.repository.uuid,
	});
}

export function parseInfoRevision(xml: string): number {
	return infoXmlSchema.parse(parseXml(xml)).info.entry['@_revision'];
}

export function parseLogXml(xml: string): Commit[] {
	const parsed = logXmlSchema.parse(parseXml(xml));
	if (parsed.log === '') {
		return [];
	}
	return parsed.log.logentry.map((entry) =>
		commitSchema.parse({
			revision: entry['@_revision'],
			author: entry.author === undefined ? null : text(entry.author),
			date: entry.date,
			message: text(entry.msg),
		}),
	);
}
