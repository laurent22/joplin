import { _ } from '@joplin/lib/locale';
import { TagEntity } from '@joplin/lib/services/database/types';
import { ListRendererDependency } from '@joplin/lib/services/plugins/api/noteListType';
import time from '@joplin/lib/time';

export default (name: ListRendererDependency, value: any) => {
	const getValue = () => {
		const baseName = name.endsWith(':display') ? name.substring(0, name.length - 8) as ListRendererDependency : name;

		const renderers: Partial<Record<ListRendererDependency, ()=> string>> = {
			'note.user_updated_time': () => time.unixMsToLocalDateTime(value),
			'note.user_created_time': () => time.unixMsToLocalDateTime(value),
			'note.updated_time': () => time.unixMsToLocalDateTime(value),
			'note.created_time': () => time.unixMsToLocalDateTime(value),
			'note.todo_completed': () => value ? time.unixMsToLocalDateTime(value) : '-',
			'note.tags': () => value ? value.map((t: TagEntity) => t.title).join(', ') : '',
			'note.folder.title': () => value ? value.title : '',
		};

		const renderer = renderers[baseName];
		if (renderer) return renderer();

		if (!name.endsWith(':display')) return value;

		if (typeof value === 'boolean') return value ? _('yes') : _('no');

		if (typeof value === 'number') return value.toString();

		if (value === null || value === undefined) return '-';

		if (typeof value === 'object' || Array.isArray(value)) return JSON.stringify(value);

		return value.toString();
	};

	return getValue();
};
