import { State } from '../../reducer';
import { getTrashFolderId } from '../trash';
import stateToWhenClauseContext from './stateToWhenClauseContext';


describe('stateToWhenClauseContext', () => {

	it('should be in trash if selected note has been deleted and selected folder is trash', async () => {
		const applicationState = {
			selectedNoteIds: ['1'],
			selectedFolderId: getTrashFolderId(),
			notes: [
				{ id: '1', deleted_time: 1722567036580 },
			],
			folders: [],
		} as State;
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.inTrash).toBe(true);
	});

	it('should NOT be in trash if selected note has not been deleted', async () => {
		const applicationState = {
			selectedNoteIds: ['1'],
			selectedFolderId: getTrashFolderId(),
			notes: [
				{ id: '1', deleted_time: 0 },
			],
			folders: [],
		} as State;
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.inTrash).toBe(false);
	});

	it('should NOT be in trash if selected folder is not trash', async () => {
		const applicationState = {
			selectedNoteIds: ['1'],
			selectedFolderId: 'any-other-folder',
			notes: [
				{ id: '1', deleted_time: 1722567036580 },
			],
			folders: [],
		} as State;
		const resultingState = stateToWhenClauseContext(applicationState);

		expect(resultingState.inTrash).toBe(false);
	});

	it('should be in trash if command folder is deleted', async () => {
		const applicationState = {
			notes: [],
			folders: [
				{ id: '1', deleted_time: 1722567036580, share_id: '', parent_id: '' },
			],
		} as State;
		const resultingState = stateToWhenClauseContext(applicationState, { commandFolderId: '1' });

		expect(resultingState.inTrash).toBe(true);
	});

	it('should NOT be in trash if command folder is not deleted', async () => {
		const applicationState = {
			notes: [],
			folders: [
				{ id: '1', deleted_time: 0, share_id: '', parent_id: '' },
			],
		} as State;
		const resultingState = stateToWhenClauseContext(applicationState, { commandFolderId: '1' });

		expect(resultingState.inTrash).toBe(false);
	});

});
