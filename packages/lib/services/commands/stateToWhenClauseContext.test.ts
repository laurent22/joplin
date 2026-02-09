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
});
