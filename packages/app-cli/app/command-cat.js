const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const BaseModel = require('@joplin/lib/BaseModel').default;
const BaseItem = require('@joplin/lib/models/BaseItem').default;
const Note = require('@joplin/lib/models/Note').default;

class Command extends BaseCommand {
	usage() {
		return 'cat <note>';
	}

	description() {
		return _('Displays the given note.');
	}

	options() {
		return [['-v, --verbose', _('Displays the complete information about note.')]];
	}

	async action(args) {
		const title = args['note'];

		const item = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));

		let content = '';

		if (item.encryption_applied) {
			content = BaseItem.displayTitle(item);
		} else {
			content = args.options.verbose ? await Note.serialize(item) : await Note.serializeForEdit(item);
		}

		this.stdout(content);
		app().gui().showConsole();
		app().gui().maximizeConsole();
	}
}

module.exports = Command;
