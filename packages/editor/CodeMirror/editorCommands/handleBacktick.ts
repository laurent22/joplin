import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const handleBacktick = (view: EditorView) => {
	const { state, dispatch } = view;
	if (view.composing || view.compositionStarted || view.state.readOnly) return false;

	const changes = state.changeByRange(range => {
		if (!range.empty) return { range };

		const pos = range.from;
		const textBefore = state.doc.sliceString(Math.max(0, pos - 2), pos);
		const charAfter = state.doc.sliceString(pos, pos + 1);
		const backticksBefore = textBefore.length - textBefore.replace(/`+$/, '').length;

		if (backticksBefore >= 2) {
			return {
				range: EditorSelection.cursor(pos + 1),
				changes: { from: pos, to: pos, insert: '`' },
			};
		}

		if (backticksBefore === 0) {
			if (charAfter === '`') {
				return {
					range: EditorSelection.cursor(pos + 1),
				};
			}
			return {
				range: EditorSelection.cursor(pos + 1),
				changes: { from: pos, to: pos, insert: '``' },
			};
		}

		if (backticksBefore === 1 && charAfter === '`') {
			return {
				range: EditorSelection.cursor(pos + 1),
			};
		}

		return { range };
	});

	if (changes.changes.empty && changes.selection.eq(state.selection)) return false;

	dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }));
	return true;
};

export default handleBacktick;
