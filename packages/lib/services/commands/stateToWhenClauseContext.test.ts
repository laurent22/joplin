import { defaultState } from '../../reducer';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { FolderEntity, NoteEntity } from '../database/types';
import { getTrashFolderId } from '../trash';
import stateToWhenClauseContext from './stateToWhenClauseContext';

jest.mock('../noteLock/isNoteLockEnabled', () => () => true);

interface StateOptions {
	folders: FolderEntity[];
	notes: NoteEntity[];
	selectedFolderId: string;
	selectedFolderIds: string[];
	selectedNoteIds: string[];
	notesParentType: string;
	noteLockSessionUnlocked: boolean;
	activeNoteIsUndecryptable: boolean;
}
const buildState = (options: Partial<StateOptions>) => {
	return {
		...defaultState,
		selectedFolderIds: options.selectedFolderId ? [options.selectedFolderId] : [],
		...options,
	};
};

describe('stateToWhenClauseContext', () => {
	it.each([
		{
			label: 'the note lock session is locked',
			noteLockSessionUnlocked: false,
			activeNoteIsUndecryptable: false,
			isLocked: 1,
			expected: true,
		},
		{
			label: 'the active note cannot be decrypted',
			noteLockSessionUnlocked: true,
			activeNoteIsUndecryptable: true,
			isLocked: 1,
			expected: true,
		},
		{
			label: 'the locked note has been decrypted',
			noteLockSessionUnlocked: true,
			activeNoteIsUndecryptable: false,
			isLocked: 1,
			expected: false,
		},
		{
			label: 'the active note is not locked',
			noteLockSessionUnlocked: false,
			activeNoteIsUndecryptable: true,
			isLocked: 0,
			expected: false,
		},
	])('should make the note read-only when $label', ({ noteLockSessionUnlocked, activeNoteIsUndecryptable, isLocked, expected }) => {
		const applicationState = buildState({
			selectedNoteIds: ['1'],
			notes: [{ id: '1', is_locked: isLocked, deleted_time: 0 }],
			noteLockSessionUnlocked,
			activeNoteIsUndecryptable,
		});
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.noteIsReadOnly).toBe(expected);
		expect(resultingState.noteIsReadOnlyShare).toBe(false);
	});

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

	it.each([
		{
			label: 'should be false when no folders exist (new profile)',
			selectedFolderId: 'non-existent-folder',
			folders: [],
			expected: false,
		},
		{
			label: 'should be false when selectedFolderId is null',
			selectedFolderId: null,
			folders: [{ id: '1', deleted_time: 0, share_id: '', parent_id: '' }],
			expected: false,
		},
		{
			label: 'should be false when selected folder has been deleted',
			selectedFolderId: '1',
			folders: [{ id: '1', deleted_time: 1000, share_id: '', parent_id: '' }],
			expected: false,
		},
		{
			label: 'should be true when selected folder exists and is not deleted',
			selectedFolderId: '1',
			folders: [{ id: '1', deleted_time: 0, share_id: '', parent_id: '' }],
			expected: true,
		},
		{
			label: 'should be false when selectedFolderId does not match any folder',
			selectedFolderId: 'stale-id',
			folders: [{ id: '1', deleted_time: 0, share_id: '', parent_id: '' }],
			expected: false,
		},
	])('should set selectedFolderIsValid correctly: $label', ({ selectedFolderId, folders, expected }) => {
		const applicationState = buildState({
			selectedFolderId,
			folders,
			notes: [],
		});

		expect(
			stateToWhenClauseContext(applicationState),
		).toHaveProperty('selectedFolderIsValid', expected);
	});
});
