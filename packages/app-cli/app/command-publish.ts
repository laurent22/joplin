import { _ } from '@joplin/lib/locale';
import BaseCommand from './base-command';
import app from './app';
import Logger from '@joplin/utils/Logger';
import ShareService from '@joplin/lib/services/share/ShareService';
import { ModelType } from '@joplin/lib/BaseModel';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';

const logger = Logger.create('command-publish');

type Args = {
	note: string;
	options: {
		force?: boolean;
	};
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
		const parent = await app().loadItem(ModelType.Folder, targetNote.parent_id);

		const force = args.options.force;
		const alreadyShared = !!targetNote.is_shared;
		const ok = force || alreadyShared ? true : await this.prompt(
			_('Publish note "%s" (in notebook "%s")?', targetNote.title, parent.title ?? '<root>'),
			{ booleanAnswerDefault: 'n' },
		);
		if (!ok) return;

		logger.info('Share note: ', targetNote.id);
		const share = await ShareService.instance().shareNote(targetNote.id, false);

		this.stdout(_('Synchronising...'));
		await reg.waitForSyncFinishedThenSync();

		const userId = ShareService.instance().userId;
		const shareUrl = ShareService.instance().shareUrl(userId, share);
		this.stdout(_('Published at URL: %s', shareUrl));
	}
}

module.exports = Command;
