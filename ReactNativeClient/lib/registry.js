const { Logger } = require('lib/logger.js');
const Setting = require('lib/models/Setting.js');
const { shim } = require('lib/shim.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');

const reg = {};

reg.syncTargets_ = {};

reg.logger = () => {
	if (!reg.logger_) {
		// console.warn('Calling logger before it is initialized');
		return new Logger();
	}

	return reg.logger_;
};

reg.setLogger = l => {
	reg.logger_ = l;
};

reg.setShowErrorMessageBoxHandler = v => {
	reg.showErrorMessageBoxHandler_ = v;
};

reg.showErrorMessageBox = message => {
	if (!reg.showErrorMessageBoxHandler_) return;
	reg.showErrorMessageBoxHandler_(message);
};

reg.resetSyncTarget = (syncTargetId = null) => {
	if (syncTargetId === null) syncTargetId = Setting.value('sync.target');
	delete reg.syncTargets_[syncTargetId];
};

reg.syncTargetNextcloud = () => {
	return reg.syncTarget(SyncTargetRegistry.nameToId('nextcloud'));
};

reg.syncTarget = (syncTargetId = null) => {
	if (syncTargetId === null) syncTargetId = Setting.value('sync.target');
	if (reg.syncTargets_[syncTargetId]) return reg.syncTargets_[syncTargetId];

	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
	if (!reg.db()) throw new Error('Cannot initialize sync without a db');

	const target = new SyncTargetClass(reg.db());
	target.setLogger(reg.logger());
	reg.syncTargets_[syncTargetId] = target;
	return target;
};

// This can be used when some data has been modified and we want to make
// sure it gets synced. So we wait for the current sync operation to
// finish (if one is running), then we trigger a sync just after.
reg.waitForSyncFinishedThenSync = async () => {
	reg.waitForReSyncCalls_.push(true);
	try {
		const synchronizer = await reg.syncTarget().synchronizer();
		await synchronizer.waitForSyncToFinish();
		await reg.scheduleSync(0);
	} finally {
		reg.waitForReSyncCalls_.pop();
	}
};

reg.scheduleSync = async (delay = null, syncOptions = null) => {
	reg.schedSyncCalls_.push(true);

	try {
		if (delay === null) delay = 1000 * 10;
		if (syncOptions === null) syncOptions = {};

		let promiseResolve = null;
		const promise = new Promise((resolve) => {
			promiseResolve = resolve;
		});

		if (reg.scheduleSyncId_) {
			clearTimeout(reg.scheduleSyncId_);
			reg.scheduleSyncId_ = null;
		}

		reg.logger().debug('Scheduling sync operation...', delay);

		if (Setting.value('env') === 'dev' && delay !== 0) {
			reg.logger().info('Schedule sync DISABLED!!!');
			return;
		}

		const timeoutCallback = async () => {
			reg.timerCallbackCalls_.push(true);
			try {
				reg.scheduleSyncId_ = null;
				reg.logger().info('Preparing scheduled sync');

				const syncTargetId = Setting.value('sync.target');

				if (!(await reg.syncTarget(syncTargetId).isAuthenticated())) {
					reg.logger().info('Synchroniser is missing credentials - manual sync required to authenticate.');
					promiseResolve();
					return;
				}

				try {
					const sync = await reg.syncTarget(syncTargetId).synchronizer();

					const contextKey = `sync.${syncTargetId}.context`;
					let context = Setting.value(contextKey);
					try {
						context = context ? JSON.parse(context) : {};
					} catch (error) {
						// Clearing the context is inefficient since it means all items are going to be re-downloaded
						// however it won't result in duplicate items since the synchroniser is going to compare each
						// item to the current state.
						reg.logger().warn(`Could not parse JSON sync context ${contextKey}:`, context);
						reg.logger().info('Clearing context and starting from scratch');
						context = null;
					}

					try {
						reg.logger().info('Starting scheduled sync');
						const options = Object.assign({}, syncOptions, { context: context });
						if (!options.saveContextHandler) {
							options.saveContextHandler = newContext => {
								Setting.setValue(contextKey, JSON.stringify(newContext));
							};
						}
						const newContext = await sync.start(options);
						Setting.setValue(contextKey, JSON.stringify(newContext));
					} catch (error) {
						if (error.code == 'alreadyStarted') {
							reg.logger().info(error.message);
						} else {
							promiseResolve();
							throw error;
						}
					}
				} catch (error) {
					reg.logger().info('Could not run background sync:');
					reg.logger().info(error);
				}
				reg.setupRecurrentSync();
				promiseResolve();

			} finally {
				reg.timerCallbackCalls_.pop();
			}
		};

		if (delay === 0) {
			timeoutCallback();
		} else {
			reg.scheduleSyncId_ = setTimeout(timeoutCallback, delay);
		}
		return promise;

	} finally {
		reg.schedSyncCalls_.pop();
	}
};

reg.setupRecurrentSync = () => {
	reg.setupRecurrentCalls_.push(true);

	try {
		if (reg.recurrentSyncId_) {
			shim.clearInterval(reg.recurrentSyncId_);
			reg.recurrentSyncId_ = null;
		}

		if (!Setting.value('sync.interval')) {
			reg.logger().debug('Recurrent sync is disabled');
		} else {
			reg.logger().debug(`Setting up recurrent sync with interval ${Setting.value('sync.interval')}`);

			if (Setting.value('env') === 'dev') {
				reg.logger().info('Recurrent sync operation DISABLED!!!');
				return;
			}

			reg.recurrentSyncId_ = shim.setInterval(() => {
				reg.logger().info('Running background sync on timer...');
				reg.scheduleSync(0);
			}, 1000 * Setting.value('sync.interval'));
		}
	} finally {
		reg.setupRecurrentCalls_.pop();
	}
};

reg.setDb = v => {
	reg.db_ = v;
};

reg.db = () => {
	return reg.db_;
};

reg.cancelTimers_ = () => {
	if (this.recurrentSyncId_) {
		shim.clearInterval(reg.recurrentSyncId_);
		this.recurrentSyncId_ = null;
	}
	if (reg.scheduleSyncId_) {
		clearTimeout(reg.scheduleSyncId_);
		reg.scheduleSyncId_ = null;
	}
};

reg.cancelTimers = async () => {
	reg.logger().info('Cancelling sync timers');
	reg.cancelTimers_();

	return new Promise((resolve) => {
		setInterval(() => {
			// ensure processing complete
			if (!reg.setupRecurrentCalls_.length && !reg.schedSyncCalls_.length && !reg.timerCallbackCalls_.length && !reg.waitForReSyncCalls_.length) {
				reg.cancelTimers_();
				resolve();
			}
		}, 100);
	});
};

reg.syncCalls_ = [];
reg.schedSyncCalls_ = [];
reg.waitForReSyncCalls_ = [];
reg.setupRecurrentCalls_ = [];
reg.timerCallbackCalls_ = [];

module.exports = { reg };
