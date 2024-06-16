import { EditorState } from '@codemirror/state';
import { getIndentUnit } from '@codemirror/language';

const tabsToSpaces = (state: EditorState, text: string): string => {
	const chunks = text.split('\t');
	const spaceLen = getIndentUnit(state);
	let result = chunks[0];

	for (let i = 1; i < chunks.length; i++) {
		for (let j = result.length % spaceLen; j < spaceLen; j++) {
			result += ' ';
		}

		result += chunks[i];
	}
	return result;
};

export default tabsToSpaces;
