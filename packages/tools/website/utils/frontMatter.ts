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

const escapeFrontMatterValue = (v: string) => {
	return v
		.replace(/"/g, '\\"')
		.replace(/[\n\r]/g, ' ');
};

const formatFrontMatterValue = (key: string, value: any) => {
	if (['created', 'updated'].includes(key)) {
		return moment((value as Date)).toISOString();
	} else if (typeof value === 'string') {
		return `"${escapeFrontMatterValue(value.toString())}"`;
	} else {
		return value.toString();
	}
};

export const compileWithFrontMatter = (md: MarkdownAndFrontMatter): string => {
	const output: string[] = [];
	const header: string[] = [];

	for (const [key, value] of Object.entries(md.header)) {
		header.push(`${key}: ${formatFrontMatterValue(key, value)}`);
	}

	if (header.length) {
		output.push('---');
		output.push(header.join('\n'));
		output.push('---');
		output.push('');
	}

	output.push(md.doc);

	return output.join('\n');
};
