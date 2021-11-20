import { RecentsWidget } from './RecentsWidget';
import Note from '@joplin/lib/models/Note';
import { reg } from '@joplin/lib/registry';
import shim from '@joplin/lib/shim';

const MAX_COUNT = 10;
const DEBOUNCE_TIMEOUT = 5000;

export async function updateRecentsWidget() {
	reg.logger().info('updating recents widget');
	const recents = await Note.all({
		fields: ['id', 'title'],
		order: [{ by: 'updated_time', dir: 'DESC' }],
		limit: MAX_COUNT,
	});
	return RecentsWidget.write({
		notes: recents,
	});
}

let hasUpdateScheduled = false;

export function updateRecentsWidgetWithDebounce() {
	if (hasUpdateScheduled) {
		return;
	}
	hasUpdateScheduled = true;
	shim.setTimeout(async () => {
		await updateRecentsWidget();
		hasUpdateScheduled = false;
	}, DEBOUNCE_TIMEOUT);
}
