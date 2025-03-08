import * as QuickActions from 'react-native-quick-actions';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import CommandService from '@joplin/lib/services/CommandService';
import Logger from '@joplin/utils/Logger';
import { DeviceEventEmitter } from 'react-native';
import { GotoNoteOptions } from './commands/util/goToNote';
import { AttachFileAction } from './components/screens/Note/commands/attachFile';

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

	// List of iOS icons:
	// https://github.com/EvanBacon/expo-quick-actions?tab=readme-ov-file#system-icons
	//
	// Note: on Android, anything beyond the fourth menu item appears to be ignored, at least on
	// emulator.
	QuickActions.setShortcutItems([
		{ type: 'newNote', title: _('New note'), icon: 'Compose', userInfo },
		{ type: 'newTodo', title: _('New to-do'), icon: 'Add', userInfo },
		{ type: 'newPhoto', title: _('New photo'), icon: 'CapturePhoto', userInfo },
		{ type: 'newResource', title: _('New attachment'), icon: 'Bookmark', userInfo },
		{ type: 'newDrawing', title: _('New drawing'), icon: 'Favorite', userInfo },
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

	const isTodo = data.type === 'newTodo' ? 1 : 0;
	const options: GotoNoteOptions = {
		attachFileAction: null,
	};

	if (data.type === 'newPhoto') {
		options.attachFileAction = AttachFileAction.TakePhoto;
	} else if (data.type === 'newResource') {
		options.attachFileAction = AttachFileAction.AttachFile;
	} else if (data.type === 'newDrawing') {
		options.attachFileAction = AttachFileAction.AttachDrawing;
	}

	await CommandService.instance().execute('newNote', '', isTodo, options);
};
