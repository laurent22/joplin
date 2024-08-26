import { EditorState } from '@codemirror/state';

const isCursorAtBeginning = (state: EditorState) => {
	const selection = state.selection;
	return selection.ranges.length === 1 && selection.main.empty && selection.main.anchor === 0;
};

export default isCursorAtBeginning;
