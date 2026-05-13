import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import { ModelType } from '@joplin/lib/BaseModel';
import shim from '@joplin/lib/shim';

class Command extends BaseCommand {
	public override usage() {
		return 'attach <note> <file>';
	}

	public override description() {
		return _('Attaches the given file to the note.');
	}

	public override async action(args: { note: string; file: string }) {
		const title = args['note'];

		const note = await app().loadItem(ModelType.Note, title, { parent: app().currentFolder() });
		this.encryptionCheck(note);
		if (!note) throw new Error(_('Cannot find "%s".', title));

		const localFilePath = args['file'];

		await shim.attachFileToNote(note, localFilePath);
	}
}

module.exports = Command;
