import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import { ModelType } from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';

class Command extends BaseCommand {
	public override usage() {
		return 'geoloc <note>';
	}

	public override description() {
		return _('Displays a geolocation URL for the note.');
	}

	public override async action(args: { note: string }) {
		const title = args['note'];

		const item = await app().loadItem(ModelType.Note, title, { parent: app().currentFolder() });
		if (!item) throw new Error(_('Cannot find "%s".', title));
		const url = Note.geolocationUrl(item);
		this.stdout(url);

		app()
			.gui()
			.showConsole();
	}
}

module.exports = Command;
