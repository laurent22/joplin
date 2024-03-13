import { EditorView } from '@codemirror/view';

interface KeyInfo {
	key: string;
	code: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
}

const pressReleaseKey = (editor: EditorView, key: KeyInfo) => {
	editor.contentDOM.dispatchEvent(
		new KeyboardEvent('keydown', key),
	);
	editor.contentDOM.dispatchEvent(
		new KeyboardEvent('keyup', key),
	);
};

export default pressReleaseKey;
