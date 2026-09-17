import { runtime } from './openNote';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import reducer, { defaultState, State } from '@joplin/lib/reducer';

describe('openNote', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should select a newly inserted note at its sorted position', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const olderNote = await Note.save({ title: 'older', parent_id: folder.id });
		const note = await Note.save({ title: 'newer', parent_id: folder.id });
		let state: State = {
			...defaultState,
			folders: [folder],
			selectedFolderId: folder.id,
			notesParentType: 'Folder',
			notes: [{ ...olderNote, user_updated_time: 1000 }, { ...note, user_updated_time: 2000 }],
			settings: { 'notes.sortOrder.field': 'user_updated_time', 'notes.sortOrder.reverse': true },
			noteListLastSortTime: Date.now(),
		};
		let selectedIndex = -1;
		await runtime().execute({ state, dispatch: action => {
			state = reducer(state, action);
			if (action.type === 'FOLDER_AND_NOTE_SELECT') {
				selectedIndex = state.notes.findIndex(item => item.id === state.selectedNoteIds[0]);
			}
			return action;
		} }, note.id, 'heading');
		expect(selectedIndex).toBe(0);
		expect(state.selectedFolderId).toBe(folder.id);
		expect(state.selectedNoteIds).toEqual([note.id]);
		expect(state.selectedNoteHash).toBe('heading');
	});
});
