import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import restoreItems from '@joplin/lib/services/trash/restoreItems';

class Command extends BaseCommand {
	public override usage() {
		return 'restore <pattern>';
	}

	public override description() {
		return _('Restore the items matching <pattern> from the trash.');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const pattern = args['pattern'];

		const items = await app().loadItems('folderOrNote', pattern);
		if (!items.length) throw new Error(_('Cannot find "%s".', pattern));

		const ids = items.map(n => n.id);
		await restoreItems(items[0].type_, ids, { useRestoreFolder: true });
	}
}

module.exports = Command;
