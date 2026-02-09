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
	const onRestoreCursorPosition = useCallback(() => {
		if (editor) {
			if (initialCursorLocationRef.current) {
				editor.selection.moveToBookmark(initialCursorLocationRef.current);
			}

			appliedInitialCursorLocationRef.current = true;
		}
	}, [editor]);

	useEffect(() => {
		if (!editor) return () => {};

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
			editor.off('SelectionChange', onSelectionChange);
		};
	}, [editor, onCursorUpdate, onRestoreCursorPosition]);

	return { onRestoreCursorPosition };
};

export default useCursorPositioning;
