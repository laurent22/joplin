import { isCallbackUrl, parseCallbackUrl, CallbackUrlCommand } from '@joplin/lib/callbackUrlUtils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Tag from '@joplin/lib/models/Tag';

async function navigateTo(dispatch: Function, parameters: Object) {
	await dispatch({ type: 'NAV_BACK' });
	void dispatch({ type: 'SIDE_MENU_CLOSE' });
	await dispatch(Object.assign({ type: 'NAV_GO' }, parameters));
}

export default async (dispatch: Function, url: string) => {
	if (!isCallbackUrl(url)) {
		return;
	}

	const { command, params } = parseCallbackUrl(url);
	switch (command) {
	case CallbackUrlCommand.OpenNote:
		if (!await Note.load(params.id)) {
			return;
		}
		await navigateTo(dispatch, {
			noteId: params.id,
			routeName: 'Note',
		});
		break;
	case CallbackUrlCommand.OpenFolder:
		if (!await Folder.load(params.id)) {
			return;
		}
		await navigateTo(dispatch, {
			folderId: params.id,
			routeName: 'Folder',
		});
		break;
	case CallbackUrlCommand.OpenTag:
		if (!await Tag.load(params.id)) {
			return;
		}
		await navigateTo(dispatch, {
			tagId: params.id,
			routeName: 'Tag',
		});
		break;
	}
};
