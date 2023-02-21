const moment = require('moment');

export interface MarkdownAndFrontMatter {
	doc: string;
	created?: Date;
	updated?: Date;
	source_url?: string;
	forum_url?: string;
	tweet?: string;
}

const readProp = (line: string): string[] => {
	line = line.trim();
	const d = line.indexOf(':');
	return [line.substr(0, d).trim(), line.substr(d + 1).trim()];
};

export const stripOffFrontMatter = (md: string): MarkdownAndFrontMatter => {
	if (md.indexOf('---') !== 0) return { doc: md };

	let state = 'start';
	const lines = md.split('\n');
	const docLines: string[] = [];

	const output: MarkdownAndFrontMatter = {
		doc: '',
	};

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
			if (propLine) {
				const p = readProp(propLine);
				(output as any)[p[0]] = p[1];
			}
		}

		if (state === 'out') {
			if (line.trim()) state = 'doc';
		}

		if (state === 'doc') {
			docLines.push(line);
		}
	}

	if (state !== 'doc') throw new Error('Front matter block was not closed with "---"');

	output.doc = docLines.join('\n');

	if (output.created) output.created = moment(output.created).toDate();
	if (output.updated) output.updated = moment(output.updated).toDate();

	return output;
};

// ---
// created: 2021-07-05T09:42:47.000+00:00
// source_url: https://www.patreon.com/posts/any-ideas-for-53317699
// ---

const formatFrontMatterValue = (key: string, value: any) => {
	if (['created', 'updated'].includes(key)) {
		return moment((value as Date)).toISOString();
	} else {
		return value.toString();
	}
};

export const compileWithFrontMatter = (md: MarkdownAndFrontMatter): string => {
	const output: string[] = [];
	const header: string[] = [];

	for (const [key, value] of Object.entries(md)) {
		if (key === 'doc') continue;
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
