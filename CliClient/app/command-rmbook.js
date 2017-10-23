import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { BaseModel } from 'lib/base-model.js';
import { cliUtils } from './cli-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'rmbook <notebook>';
	}

	description() {
		return _('Deletes the given notebook.');
	}

	options() {
		return [
			['-f, --force', _('Deletes the notebook without asking for confirmation.')],
		];
	}

	async action(args) {
		const pattern = args['notebook'];
		const force = args.options && args.options.force === true;

		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, pattern);
		if (!folder) throw new Error(_('Cannot find "%s".', pattern));
		const ok = force ? true : await this.prompt(_('Delete notebook "%s"?', folder.title), { booleanAnswerDefault: 'n' });
		if (!ok) return;

		await Folder.delete(folder.id);
	}

}

module.exports = Command;