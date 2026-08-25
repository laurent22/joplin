import { EditorView } from '@codemirror/view';

const visibleEditorText = (view: EditorView) => {
	const dom = view.contentDOM;
	const clone = dom.cloneNode(true);
	if (!(clone instanceof HTMLElement)) throw new Error('Assertion: Should clone to an HTML element');

	for (const visuallyHidden of clone.querySelectorAll('.cm-hidden')) {
		visuallyHidden.remove();
	}

	return clone.textContent;
};

export default visibleEditorText;
