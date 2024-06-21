import { Line } from '@codemirror/state';

const blockQuoteRegex = /^>\s/;

export const stripBlockquote = (line: Line): string => {
	const match = line.text.match(blockQuoteRegex);

	if (match) {
		return line.text.substring(match[0].length);
	}

	return line.text;
};

export default stripBlockquote;
