import { _ } from '@joplin/lib/locale';
import BaseCommand from './base-command';
import app from './app';
import Logger from '@joplin/utils/Logger';
import ShareService from '@joplin/lib/services/share/ShareService';
import { ModelType } from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';

const logger = Logger.create('command-unpublish');

type Args = {
	note: string;
};

class Command extends BaseCommand {
	public usage() {
		return 'publish [note]';
	}

	public description() {
		return _('Publishes a note to Joplin Server or Joplin Cloud');
	}

	public options() {
		return [
			['-f, --force', _('Do not ask for user confirmation.')],
		];
	}

	public enabled() {
		return SyncTargetRegistry.isJoplinServerOrCloud(Setting.value('sync.target'));
	}

	public async action(args: Args) {
		const targetNote = await app().loadItemOrFail(ModelType.Note, args.note);

		if (!targetNote.is_shared) {
			throw new Error(_('Note not published: %s', targetNote.title));
		}

		logger.info('Unshare note: ', targetNote.id);
		await ShareService.instance().unshareNote(targetNote.id);

		const note = await Note.load(targetNote.id);
		if (note.is_shared) {
			throw new Error('Assertion failure: The note is still shared.');
		}

		this.stdout(_('Synchronising...'));
		await reg.waitForSyncFinishedThenSync();
	}
}

module.exports = Command;
