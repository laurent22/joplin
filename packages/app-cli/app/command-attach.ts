import BaseCommand from './base-command';
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import shim from '@joplin/lib/shim';

class Command extends BaseCommand {
	public override usage() {
		return 'attach <note> <file>';
	}

	public override description() {
		return _('Attaches the given file to the note.');
	}

	public override async action(args: any) {
		const title = args['note'];

		const note = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		this.encryptionCheck(note);
		if (!note) throw new Error(_('Cannot find "%s".', title));

		const localFilePath = args['file'];

		await shim.attachFileToNote(note, localFilePath);
	}
}

module.exports = Command;
