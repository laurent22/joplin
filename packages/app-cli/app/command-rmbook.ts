import BaseCommand from './base-command';
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import BaseModel from '@joplin/lib/BaseModel';

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
		const ok = force ? true : await this.prompt(_('Delete notebook? All notes and sub-notebooks within this notebook will also be deleted.'), { booleanAnswerDefault: 'n' });
		if (!ok) return;

		await Folder.delete(folder.id);
	}
}

module.exports = Command;
