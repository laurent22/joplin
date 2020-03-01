// Need to require this class instead of importing it
// to disable buggy type-checking, maybe because this
// class is undocumented.
const { DeviceEventEmitter } = require('react-native');
import * as QuickActions from 'react-native-quick-actions';
const { _ } = require('lib/locale.js');

type TData = {
	type: string
}

export default (dispatch: Function, folderId: string) => {
	const userInfo = { url: '' };
	QuickActions.setShortcutItems([
		{ type: 'New note', title: _('New note'), icon: 'Compose', userInfo },
		{ type: 'New to-do', title: _('New to-do'), icon: 'Add', userInfo },
	]);

	DeviceEventEmitter.addListener('quickActionShortcut', (data: TData) => {
		// This dispatch is to momentarily go back to reset state, similar to what
		// happens in onJoplinLinkClick_(). Easier to just go back, then go to the
		// note since the Note screen doesn't handle reloading a different note.
		//
		// This hack is necessary because otherwise you get this problem:
		// The first time you create a note from the quick-action menu, it works
		// perfectly. But if you do it again immediately later, it re-opens the
		// page to that first note you made rather than creating an entirely new
		// note. If you navigate around enough (which I think changes the redux
		// state sufficiently or something), then it'll work again.
		dispatch({ type: 'NAV_BACK' });

		if (data.type === 'New note') {
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
	});
};
