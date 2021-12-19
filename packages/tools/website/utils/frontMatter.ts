const moment = require('moment');

export interface MarkdownAndFrontMatter {
	doc: string;
	created?: Date;
	source_url?: string;
}

const readProp = (line: string): string[] => {
	line = line.trim();
	const d = line.indexOf(':');
	return [line.substr(0, d).trim(), line.substr(d + 1).trim()];
};

export const stripOffFrontMatter = (md: string): MarkdownAndFrontMatter => {
	if (md.indexOf('---') !== 0) return { doc: md };

	let state: string = 'start';
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

	return output;
};
