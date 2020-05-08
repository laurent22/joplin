import { isStringWebLink, replaceBetween } from './utils';

export const writeUrlTextHere = 'https://example.com';
export const writeTextHereString = 'Write some text here';

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export default ({ getState, item, setState }) => {
	const { selection, text } = getState();
	let newText;
	let newSelection;
	const selectedText = text.substring(selection.start, selection.end);
	if (selection.start !== selection.end) {
		if (isStringWebLink(selectedText)) {
			newText = replaceBetween(text, selection, `[${writeTextHereString}](${selectedText})`);
			newSelection = {
				start: selection.start + 1,
				end: selection.start + 1 + writeTextHereString.length,
			};
		} else {
			newText = replaceBetween(text, selection, `[${selectedText}](${writeUrlTextHere})`);
			newSelection = {
				start: selection.end + 3,
				end: selection.end + 3 + writeUrlTextHere.length,
			};
		}
	} else {
		newText = replaceBetween(text, selection, `[${writeTextHereString}](${writeUrlTextHere})`);
		newSelection = {
			start: selection.start + 1,
			end: selection.start + 1 + writeTextHereString.length,
		};
	}
	setState({ text: newText }, () => {
		setTimeout(() => {
			setState({ selection: newSelection });
		}, 25);
	});
};
