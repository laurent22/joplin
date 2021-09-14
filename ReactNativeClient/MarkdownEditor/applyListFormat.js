import { replaceBetween } from './utils';

export default ({ getState, item, setState }) => {
	let { text } = getState();
	const { selection } = getState();
	text = text || '';
	let newText;
	let newSelection;

	// Ignore multi-character selections.
	// NOTE: I was on the fence about whether more appropriate behavior would be
	// to add the list prefix (e.g. '-', '1.', '#', '##', '###') at the
	// beginning of the line where the selection begins, but for now I think
	// it's more natural to just ignore it in this case. If after using this
	// editor for a while it turns out the other way is more natural, that's
	// fine by me!
	if (selection.start !== selection.end) {
		return;
	}

	const spaceForPrefix = item.prefix.length + 1;
	const isNewLine = text.substring(selection.start - 1, selection.start) === '\n';
	if (isNewLine) { // We're at the start of a line
		newText = replaceBetween(text, selection, `${item.prefix} `);
		newSelection = { start: selection.start + spaceForPrefix, end: selection.start + spaceForPrefix };
	} else { // We're in the middle of a line
		// NOTE: It may be more natural for the prefix (e.g. '-', '1.', '#', '##')
		// to be prepended at the beginning of the line where the selection is,
		// rather than creating a new line (which is the behavior implemented here).
		// If the other way is more natural, that's fine by me!
		newText = replaceBetween(text, selection, `\n${item.prefix} `);
		newSelection = {
			start: selection.start + spaceForPrefix + 1,
			end: selection.start + spaceForPrefix + 1,
		};
	}

	setState({ text: newText }, () => {
		setTimeout(() => {
			setState({ selection: newSelection });
		}, 300);
	});
};
