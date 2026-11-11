import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import { ModelType } from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import NoteLockNote, { lockedNoteBodyPlaceholder } from '@joplin/lib/services/noteLock/NoteLockNote';
import { NoteEntity } from '@joplin/lib/services/database/types';

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

	public override async action(args: { note: string; options: { verbose?: boolean } }) {
		const title = args['note'];

		const item = await app().loadItem(ModelType.Note, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));
		// The note is loaded without the gate, so a locked body is ciphertext.
		if (isNoteLockEnabled() && NoteLockNote.isLocked(item)) (item as NoteEntity).body = lockedNoteBodyPlaceholder;

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
