import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { vorpalUtils } from './vorpal-utils.js';
import { Synchronizer } from 'lib/synchronizer.js';
const locker = require('proper-lockfile');
const fs = require('fs-extra');

class Command extends BaseCommand {

	constructor() {
		super();
		this.syncTarget_ = null;
		this.releaseLockFn_ = null;
	}

	usage() {
		return 'sync';
	}

	description() {
		return _('Synchronizes with remote storage.');
	}

	options() {
		return [
			['--target <target>', _('Sync to provided target (defaults to sync.target config value)')],
			['--filesystem-path <path>', _('For "filesystem" target only: Path to sync to.')],
			['--random-failures', 'For debugging purposes. Do not use.'],
		];
	}

	static lockFile(filePath) {
		return new Promise((resolve, reject) => {
			locker.lock(filePath, (error, release) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(release);
			});
		});
	}

	static isLocked(filePath) {
		return new Promise((resolve, reject) => {
			locker.check(filePath, (error, isLocked) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(isLocked);
			});
		});
	}

	async action(args) {
		this.releaseLockFn_ = null;

		const lockFilePath = Setting.value('tempDir') + '/synclock';
		if (!await fs.pathExists(lockFilePath)) await fs.writeFile(lockFilePath, 'synclock');

		if (await Command.isLocked(lockFilePath)) throw new Error(_('Synchronisation is already in progress.'));

		this.releaseLockFn_ = await Command.lockFile(lockFilePath);

		try {
			this.syncTarget_ = Setting.value('sync.target');
			if (args.options.target) this.syncTarget_ = args.options.target;

			let syncInitOptions = {};
			if (args.options['filesystem-path']) syncInitOptions['sync.filesystem.path'] = args.options['filesystem-path'];

			let sync = await app().synchronizer(this.syncTarget_, syncInitOptions);

			let options = {
				onProgress: (report) => {
					let lines = Synchronizer.reportToLines(report);
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

			let context = Setting.value('sync.context');
			context = context ? JSON.parse(context) : {};
			options.context = context;
			let newContext = await sync.start(options);
			Setting.setValue('sync.context', JSON.stringify(newContext));
			vorpalUtils.redrawDone();

			await app().refreshCurrentFolder();

			this.log(_('Done.'));
		} catch (error) {
			this.releaseLockFn_();
			this.releaseLockFn_ = null;
			throw error;
		}

		this.releaseLockFn_();
		this.releaseLockFn_ = null;
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