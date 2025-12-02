import { isolateHistory } from '@codemirror/commands';
import { Command } from '@codemirror/view';

export enum ClipboardAction {
	Cut = 'cut',
	Copy = 'copy',
}

type OnWriteClipboard = (text: string)=> void;
const cutOrCopyText = (onWriteClipboard: OnWriteClipboard, action: ClipboardAction): Command => (view) => {
	const state = view.state;
	const selections = state.selection.ranges.map(range => (
		state.sliceDoc(range.from, range.to)
	));
	const nonEmptySelections = selections.filter(s => !!s);

	const cutTransactions = [];
	if (nonEmptySelections.length > 0) {
		onWriteClipboard(nonEmptySelections.join('\n'));

		cutTransactions.push(state.replaceSelection(''));
	} else {
		const selectedLine = state.doc.lineAt(state.selection.main.anchor);
		onWriteClipboard(`${selectedLine.text}\n`);

		cutTransactions.push({
			changes: [{
				from: selectedLine.from,
				to: Math.min(selectedLine.to + 1, state.doc.length),
				insert: '',
			}],
		});
	}

	cutTransactions.push({
		annotations: [isolateHistory.of('full')],
		userEvent: 'delete.cut',
	});

	if (action === ClipboardAction.Cut) {
		view.dispatch(...cutTransactions);
	}

	return true;
};

export default cutOrCopyText;
