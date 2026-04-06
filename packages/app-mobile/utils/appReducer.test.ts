import appReducer from './appReducer';
import appDefaultState, { DEFAULT_ROUTE } from './appDefaultState';

const notesRoute = { type: 'NAV_GO', routeName: 'Notes', folderId: 'folder1' };
const settingsRoute = { type: 'NAV_GO', routeName: 'Config' };
const deletedFolderId = 'folder1';

const clearHistory = () => appReducer(appDefaultState, { type: 'NAV_GO', routeName: 'Notes', clearHistory: true });

// Simulates the exact scenario: navigate to a folder with no prior history, then delete it
const makeDeletedRouteWithEmptyHistory = () => {
	let state = appReducer(appDefaultState, {
		type: 'NAV_GO',
		routeName: 'Notes',
		folderId: deletedFolderId,
		clearHistory: true,
	});
	state = appReducer(state, { type: 'FOLDER_DELETE', id: deletedFolderId });
	return state;
};

describe('appReducer', () => {
	test('historyCanGoBack is true after navigating from Notes to Settings', () => {
		let state = clearHistory();
		state = appReducer(state, notesRoute);
		state = appReducer(state, settingsRoute);
		expect(state.historyCanGoBack).toBe(true);
	});

	test('historyCanGoBack remains true after navigating away from a deleted route', () => {
		let state = makeDeletedRouteWithEmptyHistory();

		// Navigate forward (e.g. open Settings)
		state = appReducer(state, settingsRoute);

		expect(state.historyCanGoBack).toBe(true);
	});

	test('going back from Settings after folder deletion lands on DEFAULT_ROUTE', () => {
		let state = makeDeletedRouteWithEmptyHistory();
		state = appReducer(state, settingsRoute);

		// Go back
		state = appReducer(state, { type: 'NAV_BACK' });

		expect(state.route).toEqual(DEFAULT_ROUTE);
	});
});
