import * as yaml from 'js-yaml';

const moment = require('moment');

export interface FrontMatter {
	created?: Date;
	updated?: Date;
	source_url?: string;
	forum_url?: string;
	tweet?: string;

	// Docusaurus
	sidebar_label?: string;
	sidebar_position?: number;
	date?: string;
	title?: string;
	description?: string;
	image?: string;
}

export interface MarkdownAndFrontMatter {
	doc: string;
	header: FrontMatter;
}

export const stripOffFrontMatter = (md: string): MarkdownAndFrontMatter => {
	if (md.indexOf('---') !== 0) return { doc: md, header: {} };

	let state = 'start';
	const lines = md.split('\n');
	const docLines: string[] = [];
	const headerLines: string[] = [];

	for (const line of lines) {
		if (state === 'start') {
			if (line !== '---') throw new Error('Expected front matter block to start with "---"');
			state = 'in';
			continue;
		}

		if (state === 'in') {
			if (line === '---') {
				state = 'out';
				continue;
			}

			const propLine = line.trim();
			headerLines.push(propLine);
		}

		if (state === 'out') {
			if (line.trim()) state = 'doc';
		}

		if (state === 'doc') {
			docLines.push(line);
		}
	}

	if (state !== 'doc') throw new Error('Front matter block was not closed with "---"');

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const header: Record<string, any> = yaml.load(headerLines.join('\n'), { schema: yaml.FAILSAFE_SCHEMA });

	if (header.created) header.created = moment(header.created).toDate();
	if (header.updated) header.updated = moment(header.updated).toDate();
	if ('sidebar_position' in header) header.sidebar_position = Number(header.sidebar_position);

	return { header, doc: docLines.join('\n') };
};

// ---
// created: 2021-07-05T09:42:47.000+00:00
// source_url: https://www.patreon.com/posts/any-ideas-for-53317699
// ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const formatFrontMatterValue = (key: string, value: any) => {
	if (['created', 'updated'].includes(key)) {
		return moment((value as Date)).toISOString();
	} else {
		return value.toString();
	}
};

export const compileWithFrontMatter = (md: MarkdownAndFrontMatter): string => {
	const output: string[] = [];

	if (Object.keys(md.header).length) {
		const header = { ...md.header };
		for (const [key, value] of Object.entries(header)) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			(header as any)[key] = formatFrontMatterValue(key, value);
		}
		const headerString = yaml.dump(header, { noCompatMode: true, schema: yaml.FAILSAFE_SCHEMA, lineWidth: 100000 });
		output.push('---');
		output.push(headerString.trim());
		output.push('---');
		output.push('');
	}

	output.push(md.doc);

	return output.join('\n');
};
