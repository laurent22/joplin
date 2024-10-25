import * as React from 'react';
import { useCallback, DragEventHandler, MutableRefObject, useState, useEffect } from 'react';
import Note from '@joplin/lib/models/Note';
import canManuallySortNotes from './canManuallySortNotes';
import { Size } from '@joplin/utils/types';
import { ItemFlow } from '@joplin/lib/services/plugins/api/noteListType';

const useDragAndDrop = (
	parentFolderIsReadOnly: boolean,
	selectedNoteIds: string[],
	selectedFolderId: string,
	listRef: MutableRefObject<HTMLDivElement>,
	scrollTop: number,
	itemSize: Size,
	notesParentType: string,
	noteSortOrder: string,
	uncompletedTodosOnTop: boolean,
	showCompletedTodos: boolean,
	flow: ItemFlow,
	itemsPerLine: number,
	selectedFolderInTrash: boolean,
) => {
	const [dragOverTargetNoteIndex, setDragOverTargetNoteIndex] = useState(null);

	const onGlobalDrop = useCallback(() => {
		setDragOverTargetNoteIndex(null);
	}, []);

	useEffect(() => {
		document.addEventListener('dragend', onGlobalDrop);
		return () => {
			document.removeEventListener('dragend', onGlobalDrop);
		};
	}, [onGlobalDrop]);

	const onDragStart: DragEventHandler = useCallback(event => {
		if (parentFolderIsReadOnly) return false;

		let noteIds = [];

		// Here there is two cases:
		// - If multiple notes are selected, we drag the group
		// - If only one note is selected, we drag the note that was clicked on
		//   (which might be different from the currently selected note)
		if (selectedNoteIds.length >= 2) {
			noteIds = selectedNoteIds;
		} else {
			const clickedNoteId = event.currentTarget.getAttribute('data-id');
			if (clickedNoteId) noteIds.push(clickedNoteId);
		}

		if (!noteIds.length) return false;

		event.dataTransfer.setDragImage(new Image(), 1, 1);
		event.dataTransfer.clearData();
		event.dataTransfer.setData('text/x-jop-note-ids', JSON.stringify(noteIds));
		return true;
	}, [parentFolderIsReadOnly, selectedNoteIds]);


	const dragTargetNoteIndex = useCallback((event: React.DragEvent) => {
		const rect = listRef.current.getBoundingClientRect();
		const lineIndexFloat = (event.clientY - rect.top + scrollTop) / itemSize.height;
		if (flow === ItemFlow.TopToBottom) {
			return Math.abs(Math.round(lineIndexFloat));
		} else {
			const lineIndex = Math.floor(lineIndexFloat);
			const rowIndexFloat = (event.clientX - rect.left) / itemSize.width;
			const rowIndex = Math.round(rowIndexFloat);
			return lineIndex * itemsPerLine + rowIndex;
		}
	}, [listRef, itemSize, scrollTop, flow, itemsPerLine]);

	const onDragOver: DragEventHandler = useCallback(event => {
		if (notesParentType !== 'Folder') return;
		if (selectedFolderInTrash) return;

		const dt = event.dataTransfer;

		if (dt.types.indexOf('text/x-jop-note-ids') >= 0) {
			event.preventDefault();
			const newIndex = dragTargetNoteIndex(event);
			if (dragOverTargetNoteIndex === newIndex) return;
			setDragOverTargetNoteIndex(newIndex);
		}
	}, [notesParentType, dragTargetNoteIndex, dragOverTargetNoteIndex, selectedFolderInTrash]);

	const onDrop: DragEventHandler = useCallback(async (event) => {
		const dt = event.dataTransfer;
		if (!dt.types.includes('text/x-jop-note-ids')) return;

		// TODO: check that parent type is folder
		if (!canManuallySortNotes(notesParentType, noteSortOrder, selectedFolderInTrash)) return;

		setDragOverTargetNoteIndex(null);

		const targetNoteIndex = dragTargetNoteIndex(event);
		const noteIds: string[] = JSON.parse(dt.getData('text/x-jop-note-ids'));

		// Prevent dropping notes outside the valid range
		if (targetNoteIndex < 0 || targetNoteIndex > selectedNoteIds.length) return;

		await Note.insertNotesAt(selectedFolderId, noteIds, targetNoteIndex, uncompletedTodosOnTop, showCompletedTodos);
	}, [notesParentType, dragTargetNoteIndex, noteSortOrder, selectedFolderId, uncompletedTodosOnTop, showCompletedTodos, selectedFolderInTrash]);

	return { onDragStart, onDragOver, onDrop, dragOverTargetNoteIndex };
};

export default useDragAndDrop;
