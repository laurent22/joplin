const Setting = require('@joplin/lib/models/Setting').default;
import BaseModel from '@joplin/lib/BaseModel';
import { _ } from '@joplin/lib/locale';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');


export default function getWindowTitle(notes: any[], selectedNoteIds: string[], selectedFolderId: string, folders: any[], screens: any, route: { type: string; routeName: string; props: any}) {
	const windowTitle = [];
	const note = selectedNoteIds.length ? BaseModel.byId(notes, selectedNoteIds[0]) : null;
	const folderId = note ? note.parent_id : selectedFolderId;
	const folder = folderId ? BaseModel.byId(folders, folderId) : null;
	const screenInfo = screens[route.routeName];
	if (screenInfo.title) {
		windowTitle.push(screenInfo.title());
	} else if (route.routeName == 'Main' && folder) {
		const folderTitle = folder.title;
		if (note) {
			const noteTitle = note.title.length ? note.title : _('Untitled');
			windowTitle.push(`${substrWithEllipsis(folderTitle, 0, 30)} > ${substrWithEllipsis(noteTitle, 0, 50)}`);
		} else { windowTitle.push(folderTitle); }
	}
	const devMarker = Setting.value('env') === 'dev' ? ' (DEV)' : '';
	windowTitle.push(`Joplin${devMarker}`);
	return windowTitle.join(' - ');
}
