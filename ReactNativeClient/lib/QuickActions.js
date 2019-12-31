
import {DeviceEventEmitter} from 'react-native';
import QuickActions from 'react-native-quick-actions';
const { _ } = require('lib/locale.js');

export default (dispatch) => {
	QuickActions.setShortcutItems([
		{type: 'New note', title: _('New note'), icon: 'Compose'},
		{type: 'New to-do', title: _('New to-do'), icon: 'Add'},
		// TODO: Add Search
		// {type: 'Search', icon: 'Search'},
	]);

	DeviceEventEmitter.addListener('quickActionShortcut', data => {
		if (data.type === 'New note') {
			dispatch({
				type: 'NAV_GO',
				noteId: null,
				folderId: null,
				routeName: 'Note',
				itemType: 'note',
			});
		}

		if (data.type === 'New to-do') {
			dispatch({
				type: 'NAV_GO',
				noteId: null,
				folderId: null,
				routeName: 'Note',
				itemType: 'todo',
			});
		}
	});
};
