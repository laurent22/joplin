import { State } from '../../reducer';
import { getTrashFolderId } from '../trash';
import stateToWhenClauseContext from './stateToWhenClauseContext';


describe('stateToWhenClauseContext', () => {

	it('should be inTrash if selectedNote has deleted_time and selectedFolderId is trash', async () => {
		const appState = {
			selectedNoteIds: ['1'],
			selectedFolderId: getTrashFolderId(),
			notes: [
				{ id: '1', deleted_time: 1722567036580 },
			],
			folders: [],
		} as State;
		const result = stateToWhenClauseContext(appState);

		expect(result.inTrash).toBe(true);
	});

	it('should NOT be inTrash if selectedNote deleted_time is 0', async () => {
		const appState = {
			selectedNoteIds: ['1'],
			selectedFolderId: getTrashFolderId(),
			notes: [
				{ id: '1', deleted_time: 0 },
			],
			folders: [],
		} as State;
		const result = stateToWhenClauseContext(appState);

		expect(result.inTrash).toBe(false);
	});

	it('should NOT be inTrash if selectedFolderId is not trash', async () => {
		const appState = {
			selectedNoteIds: ['1'],
			selectedFolderId: 'any-other-folder',
			notes: [
				{ id: '1', deleted_time: 1722567036580 },
			],
			folders: [],
		} as State;
		const result = stateToWhenClauseContext(appState);

		expect(result.inTrash).toBe(false);
	});

	it('should be inTrash if commandFolder has deleted_time', async () => {
		const appState = {
			notes: [],
			folders: [
				{ id: '1', deleted_time: 1722567036580, share_id: '', parent_id: '' },
			],
		} as State;
		const result = stateToWhenClauseContext(appState, { commandFolderId: '1' });

		expect(result.inTrash).toBe(true);
	});

	it('should NOT be inTrash if commandFolder deleted_time is 0', async () => {
		const appState = {
			notes: [],
			folders: [
				{ id: '1', deleted_time: 0, share_id: '', parent_id: '' },
			],
		} as State;
		const result = stateToWhenClauseContext(appState, { commandFolderId: '1' });

		expect(result.inTrash).toBe(false);
	});

});
