import * as QuickActions from 'react-native-quick-actions';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import CommandService from '@joplin/lib/services/CommandService';
import Logger from '@joplin/utils/Logger';
import { DeviceEventEmitter } from 'react-native';

const logger = Logger.create('setupQuickActions');

type TData = {
	type: string;
};

export default async (dispatch: Dispatch) => {
	const userInfo = { url: '' };

	if (!QuickActions.setShortcutItems) {
		logger.info('QuickActions unsupported');
		return null;
	}

	QuickActions.setShortcutItems([
		{ type: 'New note', title: _('New note'), icon: 'Compose', userInfo },
		{ type: 'New to-do', title: _('New to-do'), icon: 'Add', userInfo },
	]);

	try {
		const data = await QuickActions.popInitialAction();
		const handler = quickActionHandler(dispatch);
		await handler(data);
	} catch (error) {
		logger.error('Quick action command failed', error);
	}
	return DeviceEventEmitter.addListener('quickActionShortcut', quickActionHandler(dispatch));
};

const quickActionHandler = (dispatch: Dispatch) => async (data: TData) => {
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
