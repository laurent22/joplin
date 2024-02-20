import { _ } from '@joplin/lib/locale';
import { ColumnName } from '@joplin/lib/services/plugins/api/noteListType';

const titles: Record<ColumnName, ()=> string> = {
	'note.folder.title': () => _('Notebook: %s', _('Title')),
	'note.is_todo': () => _('To-do'),
	'note.latitude:display': () => _('Latitude'),
	'note.longitude:display': () => _('Longitude'),
	'note.source_url:display': () => _('Source'),
	'note.tags:display': () => _('Tags'),
	'note.titleHtml': () => _('Title'),
	'note.todo_completed:display': () => _('Completed'),
	'note.todo_due:display': () => _('Due'),
	'note.user_created_time:display': () => _('Created'),
	'note.user_updated_time:display': () => _('Updated'),
};

const titlesForHeader: Partial<Record<ColumnName, ()=> string>> = {
	'note.is_todo': () => '✓',
};

export default (name: ColumnName, forHeader = false) => {
	let fn: ()=> string = null;
	if (forHeader) fn = titlesForHeader[name];
	if (!fn) fn = titles[name];
	return fn ? fn() : name;
};
