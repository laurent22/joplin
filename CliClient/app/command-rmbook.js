const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const Folder = require('lib/models/Folder.js');
const BaseModel = require('lib/BaseModel.js');

class Command extends BaseCommand {
	usage() {
		return 'rmbook <notebook>';
	}

	description() {
		return _('Deletes the given notebook.');
	}

	options() {
		return [['-f, --force', _('Deletes the notebook without asking for confirmation.')]];
	}

	async action(args) {
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
