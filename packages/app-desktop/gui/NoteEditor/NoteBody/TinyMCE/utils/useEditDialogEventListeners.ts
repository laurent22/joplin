import { Editor } from 'tinymce';
import { EditDialogControl } from './useEditDialog';
import { useEffect } from 'react';
import { TinyMceEditorEvents } from './types';

const useEditDialogEventListeners = (editor: Editor|null, editDialog: EditDialogControl) => {
	useEffect(() => {
		if (!editor) return () => {};

		const dblClickHandler = (event: Event) => {
			editDialog.editExisting(event.target as Node);
		};

		const keyDownHandler = (event: KeyboardEvent) => {
			const hasModifiers = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;
			if (event.code === 'Enter' && !event.isComposing && !hasModifiers) {
				const selection = editor.selection.getNode();
				if (editDialog.isEditable(selection)) {
					editDialog.editExisting(selection);
					event.preventDefault();
				}
			}
		};

		editor.on(TinyMceEditorEvents.KeyDown, keyDownHandler);
		editor.on('DblClick', dblClickHandler);
		return () => {
			editor.off(TinyMceEditorEvents.KeyDown, keyDownHandler);
			editor.off('DblClick', dblClickHandler);
		};
	}, [editor, editDialog]);
};

export default useEditDialogEventListeners;
