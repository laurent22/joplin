import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import BaseModel from '@joplin/lib/BaseModel';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');

class Command extends BaseCommand {
	public override usage() {
		return 'rmbook <notebook>';
	}

	public override description() {
		return _('Deletes the given notebook.');
	}

	public override options() {
		return [['-f, --force', _('Deletes the notebook without asking for confirmation.')]];
	}

	public override async action(args: any) {
		const pattern = args['notebook'];
		const force = args.options && args.options.force === true;

		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, pattern);
		if (!folder) throw new Error(_('Cannot find "%s".', pattern));
		const msg = _('Move notebook "%s" to the trash?\n\nAll notes and sub-notebooks within this notebook will also be moved to the trash.', substrWithEllipsis(folder.title, 0, 32));
		const ok = force ? true : await this.prompt(msg, { booleanAnswerDefault: 'n' });
		if (!ok) return;

		await Folder.delete(folder.id, { toTrash: true });
	}
}

module.exports = Command;
