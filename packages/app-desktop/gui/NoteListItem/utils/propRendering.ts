import { _ } from '@joplin/lib/locale';
import { ListRendererDependency } from '@joplin/lib/services/plugins/api/noteListType';
import time from '@joplin/lib/time';

export default (name: ListRendererDependency, value: any) => {
	if (!name.endsWith(':display')) return value;

	const getStringValue = () => {
		const baseName = name.substring(0, name.length - 8) as ListRendererDependency;

		const renderers: Partial<Record<ListRendererDependency, ()=> string>> = {
			'note.user_updated_time': () => time.unixMsToLocalDateTime(value),
			'note.user_created_time': () => time.unixMsToLocalDateTime(value),
			'note.updated_time': () => time.unixMsToLocalDateTime(value),
			'note.created_time': () => time.unixMsToLocalDateTime(value),
			'note.todo_completed': () => value ? time.unixMsToLocalDateTime(value) : '-',
		};

		const renderer = renderers[baseName];
		if (renderer) return renderer();

		if (typeof value === 'boolean') return value ? _('yes') : _('no');

		if (typeof value === 'number') return value.toString();

		if (value === null || value === undefined) return '-';

		if (typeof value === 'object' || Array.isArray(value)) return JSON.stringify(value);

		return value.toString();
	};

	return getStringValue();
	// return { display: getStringValue() };
};
