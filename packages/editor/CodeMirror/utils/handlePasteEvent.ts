import { EditorView } from '@codemirror/view';
import { PasteFileCallback } from '../../types';

const handlePasteEvent = (event: ClipboardEvent|DragEvent, _view: EditorView, onPaste: PasteFileCallback) => {
	const dataTransfer = 'clipboardData' in event ? event.clipboardData : event.dataTransfer;
	const files = dataTransfer.files;

	let fileToPaste: File|null = null;

	// Prefer image files, if available.
	for (const file of files) {
		if (['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
			fileToPaste = file;
			break;
		}
	}

	// Fall back to other files
	if (files.length && !fileToPaste) {
		fileToPaste = files[0];
	}

	if (fileToPaste) {
		event.preventDefault();
		void onPaste(fileToPaste);
	}
};

export default handlePasteEvent;
