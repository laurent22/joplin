import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { BaseModel } from 'lib/base-model.js';
import { autocompleteItems } from './autocomplete.js';
import { vorpalUtils } from './vorpal-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'rm <pattern>';
	}

	description() {
		return 'Deletes the given item. For a notebook, all the notes within that notebook will be deleted. Use `rm ../<notebook>` to delete a notebook.';
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	options() {
		return [
			['-f, --force', 'Deletes the items without asking for confirmation.'],
		];
	}

	async action(args) {
		let pattern = args['pattern'];
		let itemType = null;
		let force = args.options && args.options.force === true;

		if (pattern.indexOf('*') < 0) { // Handle it as a simple title
			if (pattern.substr(0, 3) == '../') {
				itemType = BaseModel.TYPE_FOLDER;
				pattern = pattern.substr(3);
			} else {
				itemType = BaseModel.TYPE_NOTE;
			}

			let item = await BaseItem.loadItemByField(itemType, 'title', pattern);
			if (!item) throw new Error(_('No item with title "%s" found.', pattern));

			let ok = force ? true : await vorpalUtils.cmdPromptConfirm(this, _('Delete item?'));
			if (ok) {
				await BaseItem.deleteItem(itemType, item.id);
				if (app().currentFolder() && app().currentFolder().id == item.id) {
					let f = await Folder.defaultFolder();
					switchCurrentFolder(f);
				}
			}
		} else { // Handle it as a glob pattern
			if (app().currentFolder()) {
				let notes = await Note.previews(app().currentFolder().id, { titlePattern: pattern });
				if (!notes.length) throw new Error(_('No note matches this pattern: "%s"', pattern));
				let ok = force ? true : await vorpalUtils.cmdPromptConfirm(this, _('%d notes match this pattern. Delete them?', notes.length));
				if (ok) {
					for (let i = 0; i < notes.length; i++) {
						await Note.delete(notes[i].id);
					}
				}
			}
		}
	}

}

module.exports = Command;