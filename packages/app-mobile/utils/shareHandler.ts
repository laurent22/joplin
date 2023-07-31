import ShareExtension, { SharedData } from './ShareExtension';
import shim from '@joplin/lib/shim';

import Note from '@joplin/lib/models/Note';
import checkPermissions from './checkPermissions.js';
const { ToastAndroid } = require('react-native');
const { PermissionsAndroid } = require('react-native');
const { Platform } = require('react-native');

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default async (sharedData: SharedData, folderId: string, dispatch: Function) => {

	if (!!sharedData.resources && sharedData.resources.length > 0) {
		// No need to check permissions for iOS, the files are already in the shared container
		if (Platform.OS === 'android') {
			const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

			// Note that if the permission is NEVER_ASK_AGAIN, it might still
			// work because of the way Android permissions work after Android
			// 10. So it means in that case we give it a try anyway.
			// https://stackoverflow.com/a/73630987/561309
			if (response === PermissionsAndroid.RESULTS.DENIED) {
				ToastAndroid.show('Cannot receive shared data - permission denied', ToastAndroid.SHORT);
				ShareExtension.close();
				return;
			}
		}
	}

	// This is a bit hacky, but the surest way to go to
	// the needed note. We go back one screen in case there's
	// already a note open - if we don't do this, the dispatch
	// below will do nothing (because routeName wouldn't change)
	// Then we wait a bit for the state to be set correctly, and
	// finally we go to the new note.
	dispatch({ type: 'NAV_BACK' });

	dispatch({ type: 'SIDE_MENU_CLOSE' });

	const newNote = await Note.save({
		parent_id: folderId,
	}, { provisional: true });

	shim.setTimeout(() => {
		dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: newNote.id,
			sharedData: sharedData,
		});

		ShareExtension.close();
	}, 5);
};
