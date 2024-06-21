import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

class Command extends BaseCommand {
	public override usage() {
		return 'ren <item> <name>';
	}

	public override description() {
		return _('Renames the given <item> (note or notebook) to <name>.');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const pattern = args['item'];
		const name = args['name'];

		const item = await app().loadItem('folderOrNote', pattern);
		this.encryptionCheck(item);
		if (!item) throw new Error(_('Cannot find "%s".', pattern));

		const newItem = {
			id: item.id,
			title: name,
			type_: item.type_,
		};

		if (item.type_ === BaseModel.TYPE_FOLDER) {
			await Folder.save(newItem);
		} else {
			await Note.save(newItem);
		}
	}
}

module.exports = Command;
