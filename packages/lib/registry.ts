import Logger from '@joplin/utils/Logger';
import Setting from './models/Setting';
import shim from './shim';
import SyncTargetRegistry from './SyncTargetRegistry';
import { AnyAction, Dispatch } from 'redux';
import Synchronizer from './Synchronizer';
import time from './time';

export interface BackgroundServiceOptions {
	taskName: string;
	taskTitle: string;
	taskDesc: string;
	taskIcon: {
		name: string;
		type: string;
		package?: string;
	};
	color?: string | undefined;
	linkingURI?: string | undefined;
	progressBar?: {
		max: number;
		value: number;
		indeterminate?: boolean | undefined;
	} | undefined;
	foregroundServiceType?: ('dataSync' | 'mediaPlayback' | 'phoneCall' | 'location' | 'connectedDevice' | 'mediaProjection' | 'camera' | 'microphone' | 'health' | 'remoteMessaging' | 'systemExempted' | 'shortService' | 'specialUse')[] | undefined;
}

export interface BackgroundService {
	start(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assigning types to these variables would be too big of a refactoring
		task: (taskData?: any)=> Promise<void>,
		options: BackgroundServiceOptions
	): Promise<void>;
	stop(): Promise<void>;
	isRunning(): boolean;
	requestPermissions(): Promise<void>;
}

class Registry {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private syncTargets_: any = {};
	private logger_: Logger = null;
	private schedSyncCalls_: boolean[] = [];
	private waitForReSyncCalls_: boolean[] = [];
	private setupRecurrentCalls_: boolean[] = [];
	private timerCallbackCalls_: boolean[] = [];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private showErrorMessageBoxHandler_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private scheduleSyncId_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private recurrentSyncId_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private db_: any;
	private isOnMobileData_ = false;
	private dispatch_: Dispatch = (() => {}) as Dispatch;
	private backgroundService_: BackgroundService | null = null;

	public setBackgroundService(service: BackgroundService) {
		this.backgroundService_ = service;
	}

	public logger() {
		if (!this.logger_) {
			// console.warn('Calling logger before it is initialized');
			return new Logger();
		}

		return this.logger_;
	}

	public setLogger(l: Logger) {
		this.logger_ = l;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public setShowErrorMessageBoxHandler(v: any) {
		this.showErrorMessageBoxHandler_ = v;
	}

	public showErrorMessageBox(message: string) {
		if (!this.showErrorMessageBoxHandler_) return;
		this.showErrorMessageBoxHandler_(message);
	}

	public setDispatch(dispatch: Dispatch) {
		this.dispatch_ = dispatch;
	}

	private dispatch(action: AnyAction) {
		return this.dispatch_(action);
	}

	// If isOnMobileData is true, the doWifiConnectionCheck is not set
	// and the sync.mobileWifiOnly setting is true it will cancel the sync.
	public setIsOnMobileData(isOnMobileData: boolean) {
		this.isOnMobileData_ = isOnMobileData;
	}

	public resetSyncTarget(syncTargetId: number = null) {
		if (syncTargetId === null) syncTargetId = Setting.value('sync.target');
		delete this.syncTargets_[syncTargetId];
	}

	public syncTargetNextcloud() {
		return this.syncTarget(SyncTargetRegistry.nameToId('nextcloud'));
	}

	// There is a delay of at least 1 second to avoid using excessive data usage, as the full note contents are uploaded every time a change is made.
	// On desktop this delay is longer, to avoid distraction to the user due to the sync button continually stopping and starting spinning
	public syncAsYouTypeInterval() {
		if (shim.isElectron()) {
			return 15 * 1000;
		} else {
			return 1000;
		}
	}

	public syncTarget = (syncTargetId: number = null) => {
		if (syncTargetId === null) syncTargetId = Setting.value('sync.target');
		if (this.syncTargets_[syncTargetId]) return this.syncTargets_[syncTargetId];

		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
		if (!this.db()) throw new Error('Cannot initialize sync without a db');

		const target = new SyncTargetClass(this.db());
		target.setLogger(this.logger());
		this.syncTargets_[syncTargetId] = target;
		return target;
	};

	// This can be used when some data has been modified and we want to make
	// sure it gets synced. So we wait for the current sync operation to
	// finish (if one is running), then we trigger a sync just after.
	public waitForSyncFinishedThenSync = async (delay: number | null = 0) => {
		if (!Setting.value('sync.target')) {
			this.logger().info('waitForSyncFinishedThenSync - cancelling because no sync target is selected.');
			return;
		}

		this.waitForReSyncCalls_.push(true);
		try {
			const synchronizer = await this.syncTarget().synchronizer();
			await synchronizer.waitForSyncToFinish();
			await this.scheduleSync(delay);
		} finally {
			this.waitForReSyncCalls_.pop();
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public scheduleSync = async (delay: number = null, syncOptions: any = null, doWifiConnectionCheck = false) => {
		this.schedSyncCalls_.push(true);

		try {
			if (delay === null) delay = 1000 * 10;
			if (syncOptions === null) syncOptions = {};

			// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
			let promiseResolve: Function = null;
			const promise = new Promise((resolve) => {
				promiseResolve = resolve;
			});

			if (this.scheduleSyncId_) {
				shim.clearTimeout(this.scheduleSyncId_);
				this.scheduleSyncId_ = null;
			}

			const syncTargetId = Setting.value('sync.target');
			const isAuthenticated = syncTargetId ? await this.syncTarget(syncTargetId).isAuthenticated() : false;
			const isPartialSync = syncOptions.syncSteps?.toString() === Synchronizer.partialSyncSteps.toString();

			if (isAuthenticated && isPartialSync) {
				// Only dispatch the event if a partial sync is scheduled, which is triggered by making a change
				this.dispatch({ type: 'SYNC_PENDING_UPDATE', value: true });
			}

			if (Setting.value('env') === 'dev' && delay !== 0) {
				// this.logger().info('Schedule sync DISABLED!!!');
				// return;
			}

			this.logger().debug('Scheduling sync operation...', delay);

			const timeoutCallback = async () => {
				this.timerCallbackCalls_.push(true);
				let newContext;

				try {
					this.logger().info('Preparing scheduled sync');

					if (doWifiConnectionCheck && Setting.value('sync.mobileWifiOnly') && this.isOnMobileData_) {
						this.logger().info('Sync cancelled because we\'re on mobile data');
						this.scheduleSyncId_ = null;
						promiseResolve();
						return;
					}

					const syncTargetId = Setting.value('sync.target');

					if (!syncTargetId) {
						this.logger().info('Sync cancelled - no sync target is selected.');
						this.scheduleSyncId_ = null;
						promiseResolve();
						return;
					}

					let isAuthenticated;
					try {
						isAuthenticated = await this.syncTarget(syncTargetId).isAuthenticated();
					} catch (e) {
						isAuthenticated = false;
					}

					if (!isAuthenticated) {
						this.dispatch({
							type: 'MUST_AUTHENTICATE',
							value: true,
						});
						this.logger().info('Synchroniser is missing credentials - manual sync required to authenticate.');
						this.scheduleSyncId_ = null;
						promiseResolve();
						return;
					}
					this.dispatch({
						type: 'MUST_AUTHENTICATE',
						value: false,
					});

					// Only clear this after checking authentication, so there is no async logic between this and updating the sync status when the
					// sync is triggered, assuming the synchronizer has already been initialised
					this.scheduleSyncId_ = null;

					try {
						const sync = await this.syncTarget(syncTargetId).synchronizer();

						const contextKey = `sync.${syncTargetId}.context`;
						let context = Setting.value(contextKey);
						try {
							context = context ? JSON.parse(context) : {};
						} catch (error) {
							// Clearing the context is inefficient since it means all items are going to be re-downloaded
							// however it won't result in duplicate items since the synchroniser is going to compare each
							// item to the current state.
							this.logger().warn(`Could not parse JSON sync context ${contextKey}:`, context);
							this.logger().info('Clearing context and starting from scratch');
							context = null;
						}

						try {
							this.logger().info('Starting scheduled sync');
							const options = { ...syncOptions, context: context };
							if (!options.saveContextHandler) {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
								options.saveContextHandler = (newContext: any) => {
									Setting.setValue(contextKey, JSON.stringify(newContext));
								};
							}
							newContext = await this.startSync(sync, options);
							Setting.setValue(contextKey, JSON.stringify(newContext));
						} catch (error) {
							if (error.code === 'alreadyStarted') {
								this.logger().info(error.message);
								newContext = null; // Prevent resetting syncPending to false if another sync is triggered while one is in progress
							} else {
								promiseResolve();
								throw error;
							}
						}
					} catch (error) {
						this.logger().info('Could not run background sync:');
						this.logger().info(error);
					}
					this.setupRecurrentSync();
					promiseResolve();

				} finally {
					if (newContext === undefined) {
						// If the logic in the try block returns before executing the sync, ensure syncPending is reset back to false
						this.dispatch({ type: 'SYNC_PENDING_UPDATE', value: false });
					}

					this.timerCallbackCalls_.pop();
				}
			};

			if (delay === 0) {
				void timeoutCallback();
			} else {
				this.scheduleSyncId_ = shim.setTimeout(timeoutCallback, delay);
			}
			return promise;

		} finally {
			this.schedSyncCalls_.pop();
		}
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Assigning types to these variables would be too big of a refactoring
	private async startSync(sync: Synchronizer, options: any) {
		// Service will only be populated for the native mobile apps
		const service = this.backgroundService_;
		if (!service) return sync.start(options);

		await service.requestPermissions();

		try {
			return await service.start(async () => {
				let response = null;
				if (sync.state() === 'idle') {
					this.logger().debug('registry.startSync: Background service started');
					response = await sync.start(options);

					// The sync may schedule another sync which will sync items changed during the sync. We need to wait for this sync to complete if that
					// is the case, because if the app is in the background when this happens, we need to keep the service active for this additional sync
					// to complete
					while (this.scheduleSyncId_) {
						await time.sleep(1);
					}

					// Grace period to prevent race conditions
					await time.sleep(0.1);

					if (sync.state() !== 'idle') this.logger().debug('registry.startSync: Waiting for additional sync to finish');
					await sync.waitForSyncToFinish();
				}

				this.logger().debug('registry.startSync: Background service ended');
				return response;
			}, {
				taskName: 'Sync',
				taskTitle: 'Syncing data',
				taskDesc: 'Sync in progress...',
				taskIcon: {
					name: 'ic_stat_sync',
					type: 'drawable',
				},
				foregroundServiceType: ['dataSync'],
			});
		} catch (e) {
			// Local testing shows that service.start will execute the enclosed logic even while the service is already running, so it isn't expected for
			// an exception to be thrown here. But if this does happen, just run the sync normally
			this.logger().warn('registry.startSync: Starting background service failed, running sync directly', e);
			return sync.start(options);
		}
	}

	public setupRecurrentSync() {
		this.setupRecurrentCalls_.push(true);

		try {
			if (this.recurrentSyncId_) {
				shim.clearInterval(this.recurrentSyncId_);
				this.recurrentSyncId_ = null;
			}

			if (!Setting.value('sync.interval')) {
				this.logger().debug('Recurrent sync is disabled');
			} else {
				this.logger().debug(`Setting up recurrent sync with interval ${Setting.value('sync.interval')}`);

				if (Setting.value('env') === 'dev') {
					this.logger().info('Recurrent sync operation DISABLED!!!');
					return;
				}

				this.recurrentSyncId_ = shim.setInterval(() => {
					this.logger().info('Running background sync on timer...');
					void this.scheduleSync(0, null, true);
				}, 1000 * Setting.value('sync.interval'));
			}
		} finally {
			this.setupRecurrentCalls_.pop();
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public setDb = (v: any) => {
		this.db_ = v;
	};

	public db() {
		return this.db_;
	}

	private cancelTimers_() {
		if (this.recurrentSyncId_) {
			shim.clearInterval(this.recurrentSyncId_);
			this.recurrentSyncId_ = null;
		}
		if (this.scheduleSyncId_) {
			shim.clearTimeout(this.scheduleSyncId_);
			this.scheduleSyncId_ = null;
		}
	}

	public cancelTimers = async () => {
		this.logger().info('Cancelling sync timers');
		this.cancelTimers_();

		return new Promise((resolve) => {
			shim.setInterval(() => {
				// ensure processing complete
				if (!this.setupRecurrentCalls_.length && !this.schedSyncCalls_.length && !this.timerCallbackCalls_.length && !this.waitForReSyncCalls_.length) {
					this.cancelTimers_();
					resolve(null);
				}
			}, 100);
		});
	};

}

export type { Registry };

const reg = new Registry();

// eslint-disable-next-line import/prefer-default-export
export { reg };

export function initializeRegistry(deps: {
	backgroundService?: BackgroundService;
}) {
	if (deps.backgroundService) {
		reg.setBackgroundService(deps.backgroundService);
	}
}
