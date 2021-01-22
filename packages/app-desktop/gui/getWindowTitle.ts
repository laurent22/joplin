const Setting = require('@joplin/lib/models/Setting').default;
import BaseModel from '@joplin/lib/BaseModel';
import { _ } from '@joplin/lib/locale';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');

function getWindowTitle(props: any) {
	const windowTitle = [];
	const note = props.selectedNoteIds.length ? BaseModel.byId(props.notes, props.selectedNoteIds[0]) : null;
	const folder = props.selectedFolderId ? BaseModel.byId(props.folders, props.selectedFolderId) : null;
	const screenInfo = props.screens[props.route.routeName];
	if (screenInfo.title) {
		windowTitle.push(screenInfo.title());
	} else if (props.route.routeName == 'Main' && folder && note) {
		const folderTitle = folder.title.trim();
		const noteTitle = note.title.trim().length ? note.title.trim() : _('Untitled');
		windowTitle.push(`${substrWithEllipsis(folderTitle, 0, 30)} > ${substrWithEllipsis(noteTitle, 0, 50)}`);
	}
	const devMarker = Setting.value('env') === 'dev' ? ' (DEV)' : '';
	windowTitle.push(`Joplin${devMarker}`);
	return windowTitle.join(' - ');
}

module.exports = getWindowTitle;
