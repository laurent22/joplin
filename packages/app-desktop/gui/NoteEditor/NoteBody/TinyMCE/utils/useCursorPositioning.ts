import { useCallback, useEffect, useRef } from 'react';
import { Bookmark, Editor } from 'tinymce';
import { OnCursorMotion } from '../../../utils/types';

interface Props {
	initialCursorLocation: Bookmark;
	editor: Editor;
	onCursorUpdate: OnCursorMotion;
}

const useCursorPositioning = ({ initialCursorLocation, editor, onCursorUpdate }: Props) => {
	const initialCursorLocationRef = useRef(initialCursorLocation);
	initialCursorLocationRef.current = initialCursorLocation;

	const appliedInitialCursorLocationRef = useRef(false);
	const onInitialContentSet = useCallback(() => {
		if (editor) {
			if (initialCursorLocationRef.current) {
				editor.selection.moveToBookmark(initialCursorLocationRef.current);
			}

			appliedInitialCursorLocationRef.current = true;
		}
	}, [editor]);

	useEffect(() => {
		if (!editor) return () => {};

		editor.on('ContentSet', onInitialContentSet);

		const onSelectionChange = () => {
			// Wait until the initial cursor position has been set. This avoids resetting
			// the initial cursor position to zero when the editor first loads.
			if (!appliedInitialCursorLocationRef.current) return;

			// Use an offset bookmark -- the default bookmark type is not preserved after unloading
			// and reloading the editor.
			const offsetBookmarkId = 2;
			onCursorUpdate({
				richText: editor.selection.getBookmark(offsetBookmarkId, true),
			});
		};

		editor.on('SelectionChange', onSelectionChange);

		return () => {
			editor.off('ContentSet', onInitialContentSet);
			editor.off('SelectionChange', onSelectionChange);
		};
	}, [editor, onCursorUpdate, onInitialContentSet]);

	return { onInitialContentSet };
};

export default useCursorPositioning;
