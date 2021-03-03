const Setting = require('@joplin/lib/models/Setting').default;
import BaseModel from '@joplin/lib/BaseModel';
import { _ } from '@joplin/lib/locale';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');
import { AppState } from '../app';

// notes: any, selectedNoteIds: any, selectedFolderId: any, folders: any, screens: any, route: any
export default function getWindowTitle(state: AppState) {
	const windowTitle = [];
	const note = state.selectedNoteIds.length ? BaseModel.byId(state.notes, state.selectedNoteIds[0]) : null;
	const folderId = note ? note.parent_id : state.selectedFolderId;
	const folder = folderId ? BaseModel.byId(state.folders, folderId) : null;
	const screenInfo = state.screens[state.route.routeName];
	if (screenInfo.title) {
		windowTitle.push(screenInfo.title());
	} else if (state.route.routeName == 'Main' && folder) {
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
