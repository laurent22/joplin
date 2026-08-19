import { EditorView } from '@codemirror/view';
import { PasteFileCallback } from '../../types';
import getFileFromPasteEvent from '../../utils/getFileFromPasteEvent';

const handlePasteEvent = (event: ClipboardEvent|DragEvent, _view: EditorView, onPaste: PasteFileCallback) => {
	const fileToPaste = getFileFromPasteEvent(event);

	if (fileToPaste) {
		event.preventDefault();
		void onPaste(fileToPaste);
	}
};

export default handlePasteEvent;
