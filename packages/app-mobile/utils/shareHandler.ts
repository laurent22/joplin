import ShareExtension, { SharedData } from './ShareExtension';
import shim from '@joplin/lib/shim';

import Note from '@joplin/lib/models/Note';
import checkPermissions from './checkPermissions.js';
const { ToastAndroid } = require('react-native');
const { PermissionsAndroid } = require('react-native');

export default async (sharedData: SharedData, folderId: string, dispatch: Function) => {

	if (!!sharedData.resources && sharedData.resources.length > 0) {
		const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);

		if (response !== PermissionsAndroid.RESULTS.GRANTED) {
			ToastAndroid.show('Cannot receive shared data - permission denied', ToastAndroid.SHORT);
			ShareExtension.close();
			return;
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
	}, 5);
};
