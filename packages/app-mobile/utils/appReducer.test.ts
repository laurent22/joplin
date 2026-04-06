import appReducer from './appReducer';
import appDefaultState, { DEFAULT_ROUTE } from './appDefaultState';

// The reducer uses a module-level navHistory array. To isolate tests, each test
// should dispatch a NAV_GO with clearHistory: true before asserting.

const notesRoute = { type: 'NAV_GO', routeName: 'Notes', folderId: 'folder1' };
const settingsRoute = { type: 'NAV_GO', routeName: 'Config' };

const clearHistory = () => appReducer(appDefaultState, { type: 'NAV_GO', routeName: 'Notes', clearHistory: true });

describe('appReducer', () => {
	test('historyCanGoBack is true after navigating from Notes to Settings', () => {
		let state = clearHistory();
		state = appReducer(state, notesRoute);
		state = appReducer(state, settingsRoute);
		expect(state.historyCanGoBack).toBe(true);
	});

	test('historyCanGoBack remains true after navigating away from a deleted route', () => {
		// Simulate: navigate to a folder, folder gets deleted (route.isDeleted = true),
		// then navigate to Settings, back button must still be available.
		let state = clearHistory();
		state = appReducer(state, notesRoute);

		// Mark the current route as deleted (as FOLDER_DELETE does)
		state = { ...state, route: { ...state.route, isDeleted: true } };

		// Navigate forward (e.g. open Settings)
		state = appReducer(state, settingsRoute);

		expect(state.historyCanGoBack).toBe(true);
	});

	test('going back from Settings after folder deletion lands on DEFAULT_ROUTE', () => {
		let state = clearHistory();
		state = appReducer(state, notesRoute);

		state = { ...state, route: { ...state.route, isDeleted: true } };
		state = appReducer(state, settingsRoute);

		// Go back
		state = appReducer(state, { type: 'NAV_BACK' });

		expect(state.route.routeName).toBe(DEFAULT_ROUTE.routeName);
	});
});
