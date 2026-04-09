import { EditorState, Line } from '@codemirror/state';
import uslug from '@joplin/fork-uslug/lib/uslug';
import normalizeHeadingForHash from '../../../../utils/normalizeHeadingForHash';

// Searches the given `state` for a line that matches the target link.
const findLineMatchingLink = (link: string, state: EditorState): Line|null => {
	const isAnchorLink = link.startsWith('#');
	const isFootnote = link.startsWith('[^') && link.endsWith(']');

	if (!isAnchorLink && !isFootnote) return null;

	const matchesLine = (line: string) => {
		if (isAnchorLink) {
			line = line.replace(/^#+/, '').trim();
			const targetHash = link.substring(1);

			const canonicalHash = uslug(normalizeHeadingForHash(line));
			if (canonicalHash === targetHash) {
				return true;
			}

			const legacyHash = uslug(line);
			return legacyHash === targetHash;
		} else if (isFootnote) {
			return line.trim().startsWith(`${link}:`);
		}
		return false;
	};

	let iterator = state.doc.iterLines();
	let lineNumber = 0;
	while (!iterator.done && lineNumber <= state.doc.lines) {
		lineNumber ++;
		iterator = iterator.next();
		const line = iterator.value;

		if (matchesLine(line)) {
			return state.doc.line(lineNumber);
		}
	}

	return null;
};

export default findLineMatchingLink;
