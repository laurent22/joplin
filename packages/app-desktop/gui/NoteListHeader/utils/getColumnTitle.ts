import { _ } from '@joplin/lib/locale';
import { ColumnName } from '@joplin/lib/services/plugins/api/noteListType';

const titles: Record<ColumnName, ()=> string> = {
	'note.folder.title': () => _('Notebook: %s', _('Title')),
	'note.is_todo': () => _('To-do'),
	'note.latitude': () => _('Latitude'),
	'note.longitude': () => _('Longitude'),
	'note.source_url': () => _('Source'),
	'note.tags': () => _('Tags'),
	'note.title': () => _('Title'),
	'note.todo_completed': () => _('Completed'),
	'note.todo_due': () => _('Due'),
	'note.user_created_time': () => _('Created'),
	'note.user_updated_time': () => _('Updated'),
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
