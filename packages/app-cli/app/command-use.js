const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const BaseModel = require('@joplin/lib/BaseModel').default;

class Command extends BaseCommand {
	usage() {
		return 'use <notebook>';
	}

	description() {
		return _('Switches to [notebook] - all further operations will happen within this notebook.');
	}

	compatibleUis() {
		return ['cli'];
	}

	async action(args) {
		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, args['notebook']);
		if (!folder) throw new Error(_('Cannot find "%s".', args['notebook']));
		app().switchCurrentFolder(folder);
	}
}

module.exports = Command;
