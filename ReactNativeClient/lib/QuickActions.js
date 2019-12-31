
import {DeviceEventEmitter} from 'react-native';
import QuickActions from 'react-native-quick-actions';
const { _ } = require('lib/locale.js');

export default (dispatch, folderId/* , state*/) => {
	QuickActions.setShortcutItems([
		{type: 'New note', title: _('New note'), icon: 'Compose'},
		{type: 'New to-do', title: _('New to-do'), icon: 'Add'},
		// TODO: Add Search
		// {type: 'Search', icon: 'Search'},
	]);

	DeviceEventEmitter.addListener('quickActionShortcut', data => {
		// console.log('JSON.stringify(state, null, 2):');
		// console.log(JSON.stringify(state, null, 2));

		// dispatch({ type: 'NOTE_SELECTION_END' });
		// dispatch({ type: 'SIDE_MENU_CLOSE' });

		// Momentarily go back to `All notes` home screen to reset state
		dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			smartFilterId: 'c3176726992c11e9ac940492261af972',
		});

		// setTimeout(() => { // This didn't work
		if (data.type === 'New note') {
			console.log('create new note with folderId =', folderId);

			dispatch({
				type: 'NAV_GO',
				noteId: null,
				folderId,
				routeName: 'Note',
				itemType: 'note',
			});
		}

		if (data.type === 'New to-do') {
			dispatch({
				type: 'NAV_GO',
				noteId: null,
				folderId,
				routeName: 'Note',
				itemType: 'todo',
			});
		}
		// }, 100);
	});
};
