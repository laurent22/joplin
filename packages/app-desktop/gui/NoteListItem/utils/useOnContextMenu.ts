import Folder from '@joplin/lib/models/Folder';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { useCallback } from 'react';
import { Dispatch } from 'redux';
import bridge from '../../../services/bridge';
import NoteListUtils from '../../utils/NoteListUtils';

const useOnContextMenu = (
	selectedNoteIds: string[],
	selectedFolderId: string,
	notes: NoteEntity[],
	dispatch: Dispatch,
	watchedNoteFiles: string[],
	plugins: PluginStates,
	customCss: string
) => {
	return useCallback((event: any) => {
		const currentNoteId = event.currentTarget.getAttribute('data-id');
		if (!currentNoteId) return;

		let noteIds = [];
		if (selectedNoteIds.indexOf(currentNoteId) < 0) {
			noteIds = [currentNoteId];
		} else {
			noteIds = selectedNoteIds;
		}

		if (!noteIds.length) return;

		const menu = NoteListUtils.makeContextMenu(noteIds, {
			notes: notes,
			dispatch: dispatch,
			watchedNoteFiles: watchedNoteFiles,
			plugins: plugins,
			inConflictFolder: selectedFolderId === Folder.conflictFolderId(),
			customCss: customCss,
		});

		menu.popup({ window: bridge().window() });
	}, [selectedNoteIds, notes, dispatch, watchedNoteFiles, plugins, selectedFolderId, customCss]);
};

export default useOnContextMenu;
