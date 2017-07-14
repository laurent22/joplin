import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { vorpalUtils } from './vorpal-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'sync';
	}

	description() {
		return 'Synchronizes with remote storage.';
	}

	options() {
		return [
			['--random-failures', 'For debugging purposes. Do not use.'],
		];
	}

	async action(args) {
		let sync = await app().synchronizer(Setting.value('sync.target'));

		let options = {
			onProgress: (report) => {
				let lines = sync.reportToLines(report);
				if (lines.length) vorpalUtils.redraw(lines.join(' '));
			},
			onMessage: (msg) => {
				vorpalUtils.redrawDone();
				this.log(msg);
			},
			randomFailures: args.options['random-failures'] === true,
		};

		this.log(_('Synchronization target: %s', Setting.value('sync.target')));

		if (!sync) throw new Error(_('Cannot initialize synchronizer.'));

		this.log(_('Starting synchronization...'));

		await sync.start(options);
		vorpalUtils.redrawDone();
		this.log(_('Done.'));
	}

	async cancel() {
		vorpalUtils.redrawDone();
		this.log(_('Cancelling...'));
		let sync = await app().synchronizer(Setting.value('sync.target'));
		sync.cancel();
	}

}

module.exports = Command;