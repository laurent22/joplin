import { replaceBetween } from './utils';

export default ({ getState, item, setState }) => {
	let { text } = getState();
	const { selection } = getState();
	text = text || '';
	let newText;
	let newSelection;
	if (selection.start !== selection.end) {
		newText = replaceBetween(
			text,
			selection,
			`${item.prefix} ${text.substring(selection.start, selection.end)}\n`,
		);
		newSelection = { start: selection.end + 3, end: selection.end + 3 };
	} else if (
		selection.start === selection.end &&
    text.substring(selection.end - 1, selection.end) === '\n'
	) {
		newText = replaceBetween(text, selection, `${item.prefix} `);
		newSelection = { start: selection.start + 2, end: selection.start + 2 };
	} else {
		newText = replaceBetween(text, selection, `\n${item.prefix} `);
		newSelection = { start: selection.start + 3, end: selection.start + 3 };
	}

	setState({ text: newText }, () => {
		setTimeout(() => {
			setState({ selection: newSelection });
		}, 300);
	});
};
