const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@joplin/lib/locale');
const BaseModel = require('@joplin/lib/BaseModel').default;
const Folder = require('@joplin/lib/models/Folder').default;
const Note = require('@joplin/lib/models/Note').default;

class Command extends BaseCommand {
	usage() {
		return 'mv <item> [notebook]';
	}

	description() {
		return _('Moves the given <item> to [notebook]');
	}

	async action(args) {
		const pattern = args['item'];
		const destination = args['notebook'];
		let folder = null;

		if (destination !== 'root') {
			folder = await app().loadItem(BaseModel.TYPE_FOLDER, destination);
			if (!folder) throw new Error(_('Cannot find "%s".', destination));
		}

		const destinationDuplicates = await Folder.search({ titlePattern: destination, limit: 2 });
		if (destinationDuplicates.length > 1) {
			throw new Error(_('Ambiguous notebook "%s". Please use short notebook id instead - press "ti" to see the short notebook id' , destination));
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
