import BaseCommand from './base-command';
import app from './app';
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
