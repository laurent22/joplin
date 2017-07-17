import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { vorpalUtils } from './vorpal-utils.js';

class Command extends BaseCommand {

	constructor() {
		super();
		this.syncTarget_ = null;
	}

	usage() {
		return 'sync';
	}

	description() {
		return 'Synchronizes with remote storage.';
	}

	options() {
		return [
			['--target <target>', 'Sync to provided target (defaults to sync.target config value)'],
			['--random-failures', 'For debugging purposes. Do not use.'],
		];
	}

	async action(args) {
		this.syncTarget_ = Setting.value('sync.target');
		if (args.options.target) this.syncTarget_ = args.options.target;

		let sync = await app().synchronizer(this.syncTarget_);

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

		this.log(_('Synchronization target: %s', this.syncTarget_));

		if (!sync) throw new Error(_('Cannot initialize synchronizer.'));

		this.log(_('Starting synchronization...'));

		await sync.start(options);
		vorpalUtils.redrawDone();

		await app().refreshCurrentFolder();

		this.log(_('Done.'));
	}

	async cancel() {
		const target = this.syncTarget_ ? this.syncTarget_ : Setting.value('sync.target');

		vorpalUtils.redrawDone();
		this.log(_('Cancelling...'));
		let sync = await app().synchronizer(target);
		sync.cancel();

		this.syncTarget_ = null;
	}

}

module.exports = Command;