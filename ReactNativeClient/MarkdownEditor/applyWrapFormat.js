import { replaceBetween } from './utils';

export default ({ getState, item, setState }) => {
	const { text, selection } = getState();
	const newText = replaceBetween(
		text,
		selection,
		item.wrapper.concat(text.substring(selection.start, selection.end), item.wrapper)
	);
	let newPosition;
	if (selection.start === selection.end) {
		newPosition = selection.end + item.wrapper.length;
	} else {
		newPosition = selection.end + item.wrapper.length * 2;
	}
	const extra = {
		selection: {
			start: newPosition,
			end: newPosition,
		},
	};
	setState({ text: newText }, () => {
		setTimeout(() => {
			setState({ ...extra });
		}, 25);
	});
};
