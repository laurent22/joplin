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
			['--stats', 'Displays stats about synchronization.'],
		];
	}

	async action(args) {
		if (args.options.stats) {
			const report = await BaseItem.stats();
			for (let n in report.items) {
				if (!report.items.hasOwnProperty(n)) continue;
				const r = report.items[n];
				this.log(_('%s: %d/%d', n, r.synced, r.total))
			}
			this.log(_('Total: %d/%d', report.total.synced, report.total.total));
		} else {
			let options = {
				onProgress: (report) => {
					let line = [];
					if (report.remotesToUpdate) line.push(_('Items to upload: %d/%d.', report.createRemote + report.updateRemote, report.remotesToUpdate));
					if (report.remotesToDelete) line.push(_('Remote items to delete: %d/%d.', report.deleteRemote, report.remotesToDelete));
					if (report.localsToUdpate) line.push(_('Items to download: %d/%d.', report.createLocal + report.updateLocal, report.localsToUdpate));
					if (report.localsToDelete) line.push(_('Local items to delete: %d/%d.', report.deleteLocal, report.localsToDelete));
					if (line.length) vorpalUtils.redraw(line.join(' '));
				},
				onMessage: (msg) => {
					vorpalUtils.redrawDone();
					this.log(msg);
				},
				randomFailures: args.options['random-failures'] === true,
			};

			this.log(_('Synchronization target: %s', Setting.value('sync.target')));

			let sync = await app().synchronizer(Setting.value('sync.target'));
			if (!sync) throw new Error(_('Cannot initialize synchronizer.'));

			this.log(_('Starting synchronization...'));

			await sync.start(options);
			this.log(_('Done.'));
		}
	}

	async cancel() {
		vorpalUtils.redrawDone();
		this.log(_('Cancelling...'));
		let sync = await app().synchronizer(Setting.value('sync.target'));
		sync.cancel();
	}

}

module.exports = Command;