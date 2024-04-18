import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import BaseModel from '@joplin/lib/BaseModel';
import { substrWithEllipsis } from '@joplin/lib/string-utils';

class Command extends BaseCommand {
	public override usage() {
		return 'rmbook <notebook>';
	}

	public override description() {
		return _('Deletes the given notebook.');
	}

	public override options() {
		return [
			['-f, --force', _('Deletes the notebook without asking for confirmation.')],
			['-p, --permanent', _('Permanently deletes the notebook, skipping the trash.')],
		];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const pattern = args['notebook'];
		const force = args.options && args.options.force === true;

		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, pattern);
		if (!folder) throw new Error(_('Cannot find "%s".', pattern));

		const permanent = args.options?.permanent === true || !!folder.deleted_time;
		const ellipsizedFolderTitle = substrWithEllipsis(folder.title, 0, 32);
		let msg;
		if (permanent) {
			msg = _('Permanently delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will be permanently deleted.', ellipsizedFolderTitle);
		} else {
			msg = _('Move notebook "%s" to the trash?\n\nAll notes and sub-notebooks within this notebook will also be moved to the trash.', ellipsizedFolderTitle);
		}
		const ok = force ? true : await this.prompt(msg, { booleanAnswerDefault: 'n' });
		if (!ok) return;

		await Folder.delete(folder.id, { toTrash: !permanent, sourceDescription: 'rmbook command' });
	}
}

module.exports = Command;
