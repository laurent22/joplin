import { useEffect } from 'react';
import type { Editor, EditorEvent } from 'tinymce';

const useTabIndenter = (editor: Editor) => {
	useEffect(() => {
		if (!editor) return () => {};

		const canChangeIndentation = () => {
			const selectionElement = editor.selection.getNode();
			return !selectionElement.closest('li, table') && !editor.readonly;
		};

		const tabStringLengthChars = 8;
		let tabString = '';
		for (let i = 0; i < tabStringLengthChars; i++) {
			tabString += '&nbsp;';
		}

		let lastKeyWasEscape = false;

		const eventHandler = (event: EditorEvent<KeyboardEvent>) => {
			if (!event.isDefaultPrevented() && event.key === 'Tab' && canChangeIndentation() && !lastKeyWasEscape) {
				if (!event.shiftKey) {
					editor.execCommand('mceInsertContent', false, tabString);
					event.preventDefault();
				} else {
					const selectionRange = editor.selection.getRng();
					if (selectionRange.collapsed) {
						let rangeStart = selectionRange.startOffset;
						let testRange = selectionRange.cloneRange();
						while (rangeStart >= 0) {
							rangeStart--;

							const lastRange = testRange.cloneRange();
							testRange.setStart(testRange.startContainer, Math.max(rangeStart, 0));
							const rangeContent = testRange.toString();
							if (!rangeContent.match(/^\s*$/) || rangeContent.length > tabStringLengthChars) {
								testRange = lastRange;
								break;
							}
						}

						if (testRange.toString().match(/\s+/)) {
							editor.selection.setRng(testRange);
							editor.execCommand('Delete', false);
							event.preventDefault();
						}
					}
				}
			} else if (event.key === 'Escape' && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey) {
				// For accessibility, let Escape followed by tab escape the focus trap.
				lastKeyWasEscape = true;
			} else if (event.key !== 'Shift') { // Allows Esc->Shift+Tab to escape the focus trap.
				lastKeyWasEscape = false;
			}
		};

		editor.on('keydown', eventHandler);
		return () => {
			editor.off('keydown', eventHandler);
		};
	}, [editor]);
};

export default useTabIndenter;
