import BaseCommand from './base-command';
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';

class Command extends BaseCommand {
	public override usage() {
		return 'geoloc <note>';
	}

	public override description() {
		return _('Displays a geolocation URL for the note.');
	}

	public override async action(args: any) {
		const title = args['note'];

		const item = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));
		const url = Note.geolocationUrl(item);
		this.stdout(url);

		app()
			.gui()
			.showConsole();
	}
}

module.exports = Command;
