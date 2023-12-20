import BaseCommand from './base-command';
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';

class Command extends BaseCommand {
	public override usage() {
		return 'cat <note>';
	}

	public override description() {
		return _('Displays the given note.');
	}

	public override options() {
		return [['-v, --verbose', _('Displays the complete information about note.')]];
	}

	public override async action(args: any) {
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
