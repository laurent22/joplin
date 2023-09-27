import { EditorView } from '@codemirror/view';


const getScrollFraction = (view: EditorView) => {
	const maxScroll = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;

	// Prevent division by zero
	return maxScroll > 0 ? view.scrollDOM.scrollTop / maxScroll : 0;
};

export default getScrollFraction;
