import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { OneDriveApiNodeUtils } from './onedrive-api-node-utils.js';
import { Setting } from 'lib/models/setting.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Synchronizer } from 'lib/synchronizer.js';
import { reg } from 'lib/registry.js';
import { cliUtils } from './cli-utils.js';
import md5 from 'md5';
const locker = require('proper-lockfile');
const fs = require('fs-extra');
const osTmpdir = require('os-tmpdir');

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
		return _('Synchronises with remote storage.');
	}

	options() {
		return [
			['--target <target>', _('Sync to provided target (defaults to sync.target config value)')],
			['--random-failures', 'For debugging purposes. Do not use.'],
		];
	}

	static lockFile(filePath) {
		return new Promise((resolve, reject) => {
			locker.lock(filePath, { stale: 1000 * 60 * 5 }, (error, release) => {
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

		// Lock is unique per profile/database
		const lockFilePath = osTmpdir() + '/synclock_' + md5(Setting.value('profileDir'));
		if (!await fs.pathExists(lockFilePath)) await fs.writeFile(lockFilePath, 'synclock');

		try {
			if (await Command.isLocked(lockFilePath)) throw new Error(_('Synchronisation is already in progress.'));

			this.releaseLockFn_ = await Command.lockFile(lockFilePath);
		} catch (error) {
			if (error.code == 'ELOCKED') {
				const msg = _('Lock file is already being hold. If you know that no synchronisation is taking place, you may delete the lock file at "%s" and resume the operation.', error.file);
				this.stdout(msg);
				return;
			}
			throw error;
		}

		try {
			this.syncTarget_ = Setting.value('sync.target');
			if (args.options.target) this.syncTarget_ = args.options.target;

			if (this.syncTarget_ == Setting.SYNC_TARGET_ONEDRIVE && !reg.syncHasAuth(this.syncTarget_)) {
				const oneDriveApiUtils = new OneDriveApiNodeUtils(reg.oneDriveApi());
				const auth = await oneDriveApiUtils.oauthDance({
					log: (...s) => { return this.stdout(...s); }
				});
				Setting.setValue('sync.3.auth', auth ? JSON.stringify(auth) : null);
				if (!auth) return;
			}
			
			let sync = await reg.synchronizer(this.syncTarget_);

			let options = {
				onProgress: (report) => {
					let lines = Synchronizer.reportToLines(report);
					if (lines.length) cliUtils.redraw(lines.join(' '));
				},
				onMessage: (msg) => {
					cliUtils.redrawDone();
					this.stdout(msg);
				},
				randomFailures: args.options['random-failures'] === true,
			};

			this.stdout(_('Synchronisation target: %s (%s)', Setting.enumOptionLabel('sync.target', this.syncTarget_), this.syncTarget_));

			if (!sync) throw new Error(_('Cannot initialize synchroniser.'));

			this.stdout(_('Starting synchronisation...'));

			const contextKey = 'sync.' + this.syncTarget_ + '.context';
			let context = Setting.value(contextKey);

			context = context ? JSON.parse(context) : {};
			options.context = context;

			try {
				let newContext = await sync.start(options);
				Setting.setValue(contextKey, JSON.stringify(newContext));
			} catch (error) {
				if (error.code == 'alreadyStarted') {
					this.stdout(error.message);
				} else {
					throw error;
				}
			}

			await app().refreshCurrentFolder();
		} catch (error) {
			cliUtils.redrawDone();
			this.releaseLockFn_();
			this.releaseLockFn_ = null;
			throw error;
		}

		cliUtils.redrawDone();
		this.releaseLockFn_();
		this.releaseLockFn_ = null;
	}

	async cancel() {
		const target = this.syncTarget_ ? this.syncTarget_ : Setting.value('sync.target');

		cliUtils.redrawDone();

		this.stdout(_('Cancelling... Please wait.'));

		if (reg.syncHasAuth(target)) {
			let sync = await reg.synchronizer(target);
			if (sync) await sync.cancel();
		} else {
			if (this.releaseLockFn_) this.releaseLockFn_();
			this.releaseLockFn_ = null;
		}

		this.syncTarget_ = null;
	}

	cancellable() {
		return true;
	}

}

module.exports = Command;