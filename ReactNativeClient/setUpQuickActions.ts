// Need to require this class instead of importing it
// to disable buggy type-checking, maybe because this
// class is undocumented.
import * as QuickActions from 'react-native-quick-actions';
const { DeviceEventEmitter } = require('react-native');
const { _ } = require('lib/locale.js');
const Note = require('lib/models/Note.js');
const { reg } = require('lib/registry.js');

type TData = {
	type: string
}

export default (dispatch: Function, folderId: string) => {
	const userInfo = { url: '' };
	QuickActions.setShortcutItems([
		{ type: 'New note', title: _('New note'), icon: 'Compose', userInfo },
		{ type: 'New to-do', title: _('New to-do'), icon: 'Add', userInfo },
	]);

	const handleQuickAction = (data: TData) => {
		if (!data) return;

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
		dispatch({ type: 'SIDE_MENU_CLOSE' });

		const isTodo = data.type === 'New to-do' ? 1 : 0;

		Note.save({
			parent_id: folderId,
			is_todo: isTodo,
		}, { provisional: true }).then((newNote: any) => {
			dispatch({
				type: 'NAV_GO',
				noteId: newNote.id,
				folderId,
				routeName: 'Note',
			});
		});
	};

	DeviceEventEmitter.addListener('quickActionShortcut', handleQuickAction);

	QuickActions.popInitialAction().then(handleQuickAction).catch((reason: any) => reg.logger().error(reason));
};

