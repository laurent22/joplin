import { defaultState } from '../../reducer';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { FolderEntity, NoteEntity } from '../database/types';
import { getTrashFolderId } from '../trash';
import stateToWhenClauseContext from './stateToWhenClauseContext';

interface StateOptions {
	folders: FolderEntity[];
	notes: NoteEntity[];
	selectedFolderId: string;
	selectedFolderIds: string[];
	selectedNoteIds: string[];
	notesParentType: string;
	activeFolder: boolean;
}
const buildState = (options: Partial<StateOptions>) => {
	return {
		...defaultState,
		selectedFolderIds: options.selectedFolderId ? [options.selectedFolderId] : [],
		...options,
	};
};

describe('stateToWhenClauseContext', () => {
	it('should be in trash if selected note has been deleted and selected folder is trash', async () => {
		const applicationState = buildState({
			selectedNoteIds: ['1'],
			selectedFolderId: getTrashFolderId(),
			notes: [
				{ id: '1', deleted_time: 1722567036580 },
			],
			folders: [],
		});
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.inTrash).toBe(true);
	});

	it('should NOT be in trash if selected note has not been deleted', async () => {
		const applicationState = buildState({
			selectedNoteIds: ['1'],
			selectedFolderId: getTrashFolderId(),
			notes: [
				{ id: '1', deleted_time: 0 },
			],
			folders: [],
		});
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.inTrash).toBe(false);
	});

	it('should NOT be in trash if selected folder is not trash', async () => {
		const applicationState = buildState({
			selectedNoteIds: ['1'],
			selectedFolderId: 'any-other-folder',
			notes: [
				{ id: '1', deleted_time: 1722567036580 },
			],
			folders: [],
		});
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.inTrash).toBe(false);
	});

	it('should be in trash if command folder is deleted', async () => {
		const applicationState = buildState({
			notes: [],
			notesParentType: 'Folder',
			folders: [
				{ id: '1', deleted_time: 1722567036580, share_id: '', parent_id: '' },
			],
		});
		const resultingState = stateToWhenClauseContext(applicationState, { commandFolderId: '1' });

		expect(resultingState.inTrash).toBe(true);
	});

	it('should NOT be in trash if command folder is not deleted', async () => {
		const applicationState = buildState({
			notes: [],
			folders: [
				{ id: '1', deleted_time: 0, share_id: '', parent_id: '' },
			],
		});
		const resultingState = stateToWhenClauseContext(applicationState, { commandFolderId: '1' });

		expect(resultingState.inTrash).toBe(false);
	});

	it('should not be in trash if viewing all notes', async () => {
		const applicationState = buildState({
			selectedFolderId: 'folder',
			notesParentType: 'SmartFolder',
		});
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.inTrash).toBe(false);
	});

	it.each(SyncTargetRegistry.allIds().map(id => ({
		id,
		name: SyncTargetRegistry.idToName(id),
		expected: SyncTargetRegistry.isJoplinServerOrCloud(id),
	})))('should set joplinServerConnected to $expected when the sync target is $name', ({ id, expected }) => {
		const getWhenClauseContext = (syncTarget: number) => {
			const applicationState = {
				...defaultState,
				settings: {
					'sync.target': syncTarget,
				},
			};
			return stateToWhenClauseContext(applicationState);
		};

		const whenClauseContext = getWhenClauseContext(id);
		expect(whenClauseContext.joplinServerConnected).toBe(expected);
	});

	it.each([
		{
			label: 'should be true when all target folders are deleted',
			commandFolderIds: ['del1', 'del2'],
			expectedDeletedState: true,
		},
		{
			label: 'should be false when one or more target folders is not deleted',
			commandFolderIds: ['del1', 'del2', '1'],
			expectedDeletedState: false,
		},
		{
			label: 'should default to the state of the selected items',
			commandFolderIds: null,
			expectedDeletedState: false,
		},
	])('should set foldersAreDeleted correctly: $label', ({ commandFolderIds, expectedDeletedState }) => {
		const applicationState = buildState({
			folders: [
				{ id: '1', deleted_time: 0, share_id: '', parent_id: '' },
				{ id: 'del1', deleted_time: 1, share_id: '', parent_id: '' },
				{ id: 'del2', deleted_time: 1, share_id: '', parent_id: '' },
			],
			selectedFolderIds: ['1'],
			selectedFolderId: '1',
			notesParentType: 'Folder',
		});

		expect(
			stateToWhenClauseContext(applicationState, { commandFolderIds }),
		).toHaveProperty('foldersAreDeleted', expectedDeletedState);
	});




	it('should set isActiveFolder to true when there is a valid active folder', () => {
		const applicationState = buildState({
			folders: [
				{ id: 'folder1', deleted_time: 0, share_id: '', parent_id: '' },
			],
			selectedFolderId: 'folder1',
			selectedFolderIds: ['folder1'],
		});
		applicationState.settings = {
			...applicationState.settings,
			activeFolderId: 'folder1',
		};

		const resultingState = stateToWhenClauseContext(applicationState);


		expect(resultingState.isActiveFolder).toBeTruthy();
	});

	it('should set isActiveFolder to false when activeFolderId is not set', () => {
		const applicationState = buildState({
			folders: [
				{ id: 'folder1', deleted_time: 0, share_id: '', parent_id: '' },
			],
			selectedFolderId: 'folder1',
			selectedFolderIds: ['folder1'],
		});
		applicationState.settings = {
			...applicationState.settings,
			activeFolderId: '',
		};

		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.isActiveFolder).toBe(false);
	});



	it('should have required properties for button state when one notebook is selected', () => {
		const applicationState = buildState({
			folders: [
				{ id: 'folder1', deleted_time: 0, share_id: '', parent_id: '' },
			],
			selectedFolderId: 'folder1',
			selectedFolderIds: ['folder1'],
		});

		const whenClauseContext = stateToWhenClauseContext(applicationState);

		// Properties needed for button enabled state
		expect(whenClauseContext.oneFolderSelected).toBe(true);
		expect(whenClauseContext).toHaveProperty('isActiveFolder');
		expect(whenClauseContext.folderIsDeleted).toBe(false);
		expect(whenClauseContext.folderIsTrash).toBe(false);
	});

	it('should allow button enabling when folder is valid (not deleted, not trash)', () => {
		const applicationState = buildState({
			folders: [
				{ id: 'folder1', deleted_time: 0, share_id: '', parent_id: '' },
			],
			selectedFolderId: 'folder1',
			selectedFolderIds: ['folder1'],
			notesParentType: 'Folder',
		});

		const whenClauseContext = stateToWhenClauseContext(applicationState, { commandFolderId: 'folder1' });

		// All conditions that should allow button to be enabled
		expect(whenClauseContext.oneFolderSelected).toBe(true);
		expect(whenClauseContext.folderIsDeleted).toBe(false);
		expect(whenClauseContext.folderIsTrash).toBe(false);
		expect(whenClauseContext.inTrash).toBe(false);
	});

	it('should prevent button enabling when in trash folder', () => {
		const trashId = getTrashFolderId();
		const applicationState = buildState({
			folders: [],
			selectedFolderId: trashId,
			selectedFolderIds: [trashId],
			notes: [
				{ id: 'note1', deleted_time: 1722567036580 },
			],
			selectedNoteIds: ['note1'],
		});

		const whenClauseContext = stateToWhenClauseContext(applicationState);

		// Buttons should be disabled in trash
		expect(whenClauseContext.inTrash).toBe(true);
	});

	it('should handle multiple folders selected (buttons should be disabled)', () => {
		const applicationState = buildState({
			folders: [
				{ id: 'folder1', deleted_time: 0, share_id: '', parent_id: '' },
				{ id: 'folder2', deleted_time: 0, share_id: '', parent_id: '' },
			],
			selectedFolderIds: ['folder1', 'folder2'],
		});

		const whenClauseContext = stateToWhenClauseContext(applicationState);

		// When multiple folders selected, oneFolderSelected is false
		// which should disable new note/todo buttons
		expect(whenClauseContext.oneFolderSelected).toBe(false);
	});

	it('should handle no folder selected (buttons should be disabled)', () => {
		const applicationState = buildState({
			folders: [],
			selectedFolderIds: [],
		});

		const whenClauseContext = stateToWhenClauseContext(applicationState);

		// When no folder selected, buttons should be disabled
		expect(whenClauseContext.oneFolderSelected).toBe(false);
	});
});

