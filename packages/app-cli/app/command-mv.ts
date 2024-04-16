import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

class Command extends BaseCommand {
	public override usage() {
		return 'mv <item> [notebook]';
	}

	public override description() {
		return _('Moves the given <item> to [notebook]');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const pattern = args['item'];
		const destination = args['notebook'];
		let folder = null;

		if (destination !== 'root') {
			folder = await app().loadItem(BaseModel.TYPE_FOLDER, destination);
			if (!folder) throw new Error(_('Cannot find "%s".', destination));
		}

		const destinationDuplicates = await Folder.search({ titlePattern: destination, limit: 2 });
		if (destinationDuplicates.length > 1) {
			throw new Error(_('Ambiguous notebook "%s". Please use short notebook id instead - press "ti" to see the short notebook id', destination));
		}

		const itemFolder = await app().loadItem(BaseModel.TYPE_FOLDER, pattern);
		if (itemFolder) {
			const sourceDuplicates = await Folder.search({ titlePattern: pattern, limit: 2 });
			if (sourceDuplicates.length > 1) {
				throw new Error(_('Ambiguous notebook "%s". Please use notebook id instead - press "ti" to see the short notebook id or use $b for current selected notebook', pattern));
			}
			if (destination === 'root') {
				await Folder.moveToFolder(itemFolder.id, '');
			} else {
				await Folder.moveToFolder(itemFolder.id, folder.id);
			}
		} else {
			const notes = await app().loadItems(BaseModel.TYPE_NOTE, pattern);
			if (notes.length === 0) throw new Error(_('Cannot find "%s".', pattern));
			for (let i = 0; i < notes.length; i++) {
				await Note.moveToFolder(notes[i].id, folder.id);
			}
		}
	}
}

module.exports = Command;
