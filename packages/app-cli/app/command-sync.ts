import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import SyncTargetRegistry from '@joplin/lib/SyncTargetRegistry';
import MigrationHandler from '@joplin/lib/services/synchronizer/MigrationHandler';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import Synchronizer from '@joplin/lib/Synchronizer';
import { masterKeysWithoutPassword } from '@joplin/lib/services/e2ee/utils';
import { appTypeToLockType } from '@joplin/lib/services/synchronizer/LockHandler';
const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { OneDriveApiNodeUtils } = require('@joplin/lib/onedrive-api-node-utils.js');
const { reg } = require('@joplin/lib/registry.js');
const { cliUtils } = require('./cli-utils.js');
const md5 = require('md5');
const locker = require('proper-lockfile');
const fs = require('fs-extra');

class Command extends BaseCommand {

	private syncTargetId_: number = null;
	private releaseLockFn_: Function = null;
	private oneDriveApiUtils_: any = null;

	usage() {
		return 'sync';
	}

	description() {
		return _('Synchronises with remote storage.');
	}

	options() {
		return [
			['--target <target>', _('Sync to provided target (defaults to sync.target config value)')],
			['--upgrade', _('Upgrade the sync target to the latest version.')],
			['--use-lock <value>', 'Disable local locks that prevent multiple clients from synchronizing at the same time (Default = 1)'],
		];
	}

	static lockFile(filePath: string): Promise<Function> {
		return new Promise((resolve, reject) => {
			locker.lock(filePath, { stale: 1000 * 60 * 5 }, (error: any, release: any) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(release);
			});
		});
	}

	static isLocked(filePath: string) {
		return new Promise((resolve, reject) => {
			locker.check(filePath, (error: any, isLocked: boolean) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(isLocked);
			});
		});
	}

	async doAuth() {
		const syncTarget = reg.syncTarget(this.syncTargetId_);
		const syncTargetMd = SyncTargetRegistry.idToMetadata(this.syncTargetId_);

		if (this.syncTargetId_ === 3 || this.syncTargetId_ === 4) {
			// OneDrive
			this.oneDriveApiUtils_ = new OneDriveApiNodeUtils(syncTarget.api());
			const auth = await this.oneDriveApiUtils_.oauthDance({
				log: (...s: any[]) => {
					return this.stdout(...s);
				},
			});
			this.oneDriveApiUtils_ = null;

			Setting.setValue(`sync.${this.syncTargetId_}.auth`, auth ? JSON.stringify(auth) : null);
			if (!auth) {
				this.stdout(_('Authentication was not completed (did not receive an authentication token).'));
				return false;
			}

			return true;
		} else if (syncTargetMd.name === 'dropbox') {
			// Dropbox
			const api = await syncTarget.api();
			const loginUrl = api.loginUrl();
			this.stdout(_('To allow Joplin to synchronise with Dropbox, please follow the steps below:'));
			this.stdout(_('Step 1: Open this URL in your browser to authorise the application:'));
			this.stdout(loginUrl);
			const authCode = await this.prompt(_('Step 2: Enter the code provided by Dropbox:'), { type: 'string' });
			if (!authCode) {
				this.stdout(_('Authentication was not completed (did not receive an authentication token).'));
				return false;
			}

			const response = await api.execAuthToken(authCode);
			Setting.setValue(`sync.${this.syncTargetId_}.auth`, response.access_token);
			api.setAuthToken(response.access_token);
			return true;
		}

		this.stdout(_('Not authentified with %s. Please provide any missing credentials.', syncTargetMd.label));
		return false;
	}

	cancelAuth() {
		if (this.oneDriveApiUtils_) {
			this.oneDriveApiUtils_.cancelOAuthDance();
			return;
		}
	}

	doingAuth() {
		return !!this.oneDriveApiUtils_;
	}

	async action(args: any) {
		this.releaseLockFn_ = null;

		// Lock is unique per profile/database
		const lockFilePath = `${require('os').tmpdir()}/synclock_${md5(escape(Setting.value('profileDir')))}`; // https://github.com/pvorb/node-md5/issues/41
		if (!(await fs.pathExists(lockFilePath))) await fs.writeFile(lockFilePath, 'synclock');

		const useLock = args.options.useLock !== 0;

		if (useLock) {
			try {
				if (await Command.isLocked(lockFilePath)) throw new Error(_('Synchronisation is already in progress.'));

				this.releaseLockFn_ = await Command.lockFile(lockFilePath);
			} catch (error) {
				if (error.code === 'ELOCKED') {
					const msg = _('Lock file is already being hold. If you know that no synchronisation is taking place, you may delete the lock file at "%s" and resume the operation.', error.file);
					this.stdout(msg);
					return;
				}
				throw error;
			}
		}

		const cleanUp = () => {
			cliUtils.redrawDone();
			if (this.releaseLockFn_) {
				this.releaseLockFn_();
				this.releaseLockFn_ = null;
			}
		};

		try {
			this.syncTargetId_ = Setting.value('sync.target');
			if (args.options.target) this.syncTargetId_ = args.options.target;

			const syncTarget = reg.syncTarget(this.syncTargetId_);

			if (!(await syncTarget.isAuthenticated())) {
				app().gui().showConsole();
				app().gui().maximizeConsole();

				const authDone = await this.doAuth();
				if (!authDone) return cleanUp();
			}

			const sync = await syncTarget.synchronizer();

			const options: any = {
				onProgress: (report: any) => {
					const lines = Synchronizer.reportToLines(report);
					if (lines.length) cliUtils.redraw(lines.join(' '));
				},
				onMessage: (msg: string) => {
					cliUtils.redrawDone();
					this.stdout(msg);
				},
			};

			this.stdout(_('Synchronisation target: %s (%s)', Setting.enumOptionLabel('sync.target', this.syncTargetId_), this.syncTargetId_));

			if (!sync) throw new Error(_('Cannot initialise synchroniser.'));

			if (args.options.upgrade) {
				let migrationError = null;

				try {
					const migrationHandler = new MigrationHandler(
						sync.api(),
						reg.db(),
						sync.lockHandler(),
						appTypeToLockType(Setting.value('appType')),
						Setting.value('clientId')
					);

					migrationHandler.setLogger(cliUtils.stdoutLogger(this.stdout.bind(this)));

					await migrationHandler.upgrade();
				} catch (error) {
					migrationError = error;
				}

				if (!migrationError) {
					Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_IDLE);
					await Setting.saveAll();
				}

				if (migrationError) throw migrationError;

				return cleanUp();
			}

			this.stdout(_('Starting synchronisation...'));

			const contextKey = `sync.${this.syncTargetId_}.context`;
			let context = Setting.value(contextKey);

			context = context ? JSON.parse(context) : {};
			options.context = context;

			try {
				const newContext = await sync.start(options);
				Setting.setValue(contextKey, JSON.stringify(newContext));
			} catch (error) {
				if (error.code === 'alreadyStarted') {
					this.stdout(error.message);
				} else {
					throw error;
				}
			}

			// When using the tool in command line mode, the ResourceFetcher service is
			// not going to be running in the background, so the resources need to be
			// explicitly downloaded below.
			if (!app().hasGui()) {
				this.stdout(_('Downloading resources...'));
				await ResourceFetcher.instance().fetchAll();
				await ResourceFetcher.instance().waitForAllFinished();
			}

			const noPasswordMkIds = await masterKeysWithoutPassword();
			if (noPasswordMkIds.length) this.stdout(`/!\\ ${_('Your password is needed to decrypt some of your data. Type `:e2ee decrypt` to set it.')}`);

			await app().refreshCurrentFolder();
		} catch (error) {
			cleanUp();
			throw error;
		}

		if (Setting.value('sync.upgradeState') > Setting.SYNC_UPGRADE_STATE_IDLE) {
			this.stdout(`/!\\ ${_('Sync target must be upgraded! Run `%s` to proceed.', 'sync --upgrade')}`);
			app().gui().showConsole();
			app().gui().maximizeConsole();
		}

		cleanUp();
	}

	async cancel() {
		if (this.doingAuth()) {
			this.cancelAuth();
			return;
		}

		const syncTargetId = this.syncTargetId_ ? this.syncTargetId_ : Setting.value('sync.target');

		cliUtils.redrawDone();

		this.stdout(_('Cancelling... Please wait.'));

		const syncTarget = reg.syncTarget(syncTargetId);

		if (await syncTarget.isAuthenticated()) {
			const sync = await syncTarget.synchronizer();
			if (sync) await sync.cancel();
		} else {
			if (this.releaseLockFn_) this.releaseLockFn_();
			this.releaseLockFn_ = null;
		}

		this.syncTargetId_ = null;
	}

	cancellable() {
		return true;
	}
}

module.exports = Command;
