import { RecentsWidget } from './RecentsWidget';
import Note from '@joplin/lib/models/Note';

const MAX_COUNT = 10;

export default async () => {
	const recents = await Note.all({
		fields: ['id', 'title'],
		order: [{ by: 'updated_time', dir: 'DESC' }],
		limit: MAX_COUNT,
	});
	return RecentsWidget.write({
		notes: recents,
	});
};
