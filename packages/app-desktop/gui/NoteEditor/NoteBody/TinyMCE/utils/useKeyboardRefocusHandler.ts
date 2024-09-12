import CommandService from '@joplin/lib/services/CommandService';
import { useEffect } from 'react';
import type { Editor, EditorEvent } from 'tinymce';

const useKeyboardRefocusHandler = (editor: Editor) => {
	useEffect(() => {
		if (!editor) return () => {};

		const isAtBeginningOf = (element: Node, parent: HTMLElement) => {
			if (!parent.contains(element)) return false;

			while (
				element &&
				element.parentNode !== parent &&
				element.parentNode?.firstChild === element
			) {
				element = element.parentNode;
			}

			return !!element && element.parentNode?.firstChild === element;
		};

		const eventHandler = (event: EditorEvent<KeyboardEvent>) => {
			if (!event.isDefaultPrevented() && event.key === 'ArrowUp') {
				const selection = editor.selection.getRng();
				if (selection.startOffset === 0 &&
					selection.collapsed &&
					isAtBeginningOf(selection.startContainer, editor.dom.getRoot())
				) {
					event.preventDefault();
					void CommandService.instance().execute('focusElement', 'noteTitle');
				}
			}
		};

		editor.on('keydown', eventHandler);
		return () => {
			editor.off('keydown', eventHandler);
		};
	}, [editor]);
};

export default useKeyboardRefocusHandler;
