import { EditorView } from '@codemirror/view';
import typeText from './typeText';

export interface KeyInfo {
	key: string;
	code: string;
	// Text to type if the event was not processed
	typesText?: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
}

const pressReleaseKey = (editor: EditorView, key: KeyInfo) => {
	const keyDownEvent = new KeyboardEvent('keydown', key);

	let keyDownPrevented = false;
	keyDownEvent.preventDefault = () => {
		keyDownPrevented = true;
	};

	editor.contentDOM.dispatchEvent(keyDownEvent);

	if (key.typesText !== undefined && !keyDownPrevented) {
		typeText(editor, key.typesText, key);
	}

	editor.contentDOM.dispatchEvent(new KeyboardEvent('keyup', key));
};

export default pressReleaseKey;
