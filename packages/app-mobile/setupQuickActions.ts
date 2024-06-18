import * as QuickActions from 'react-native-quick-actions';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import CommandService from '@joplin/lib/services/CommandService';

type TData = {
	type: string;
};

export default () => {
	const userInfo = { url: '' };
	QuickActions.setShortcutItems([
		{ type: 'New note', title: _('New note'), icon: 'Compose', userInfo },
		{ type: 'New to-do', title: _('New to-do'), icon: 'Add', userInfo },
	]);
};

export const quickActionHandler = async (data: TData, dispatch: Dispatch) => {
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

	await CommandService.instance().execute('newNote', '', isTodo);
};
