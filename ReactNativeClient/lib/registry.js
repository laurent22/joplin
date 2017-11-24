const { Logger } = require('lib/logger.js');
const { Setting } = require('lib/models/setting.js');
const { parameters } = require('lib/parameters.js');
const { FileApi } = require('lib/file-api.js');
const { Database } = require('lib/database.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApiDriverOneDrive } = require('lib/file-api-driver-onedrive.js');
const { shim } = require('lib/shim.js');
const { time } = require('lib/time-utils.js');
const { FileApiDriverMemory } = require('lib/file-api-driver-memory.js');
const { _ } = require('lib/locale.js');

const reg = {};

reg.initSynchronizerStates_ = {};
reg.syncTargetClasses_ = {
	1: require('lib/SyncTarget1.js'),
	// 2: require('lib/SyncTarget2.js'),
	3: require('lib/SyncTarget3.js'),
};
reg.syncTargets_ = {};
//reg.synchronizers_ = {};

reg.logger = () => {
	if (!reg.logger_) {
		//console.warn('Calling logger before it is initialized');
		return new Logger();
	}

	return reg.logger_;
}

reg.setLogger = (l) => {
	reg.logger_ = l;
}

reg.syncTarget = (syncTargetId = null) => {
	if (syncTargetId === null) syncTargetId = Setting.value('sync.target');
	if (reg.syncTargets_[syncTargetId]) return reg.syncTargets_[syncTargetId];

	const SyncTargetClass = reg.syncTargetClasses_[syncTargetId];
	if (!reg.db()) throw new Error('Cannot initialize sync without a db');

	const target = new SyncTargetClass(reg.db());
	target.setLogger(reg.logger());
	reg.syncTargets_[syncTargetId] = target;
	return target;
}

// reg.synchronizer = async (syncTargetId) => {
// 	if (reg.synchronizers_[syncTargetId]) return reg.synchronizers_[syncTargetId];
// 	if (!reg.db()) throw new Error('Cannot initialize synchronizer: db not initialized');

// 	if (reg.initSynchronizerStates_[syncTargetId] == 'started') {
// 		// Synchronizer is already being initialized, so wait here till it's done.
// 		return new Promise((resolve, reject) => {
// 			const iid = setInterval(() => {
// 				if (reg.initSynchronizerStates_[syncTargetId] == 'ready') {
// 					clearInterval(iid);
// 					resolve(reg.synchronizers_[syncTargetId]);
// 				}
// 				if (reg.initSynchronizerStates_[syncTargetId] == 'error') {
// 					clearInterval(iid);
// 					reject(new Error('Could not initialise synchroniser'));
// 				}
// 			}, 1000);
// 		});
// 	} else {
// 		reg.initSynchronizerStates_[syncTargetId] = 'started';

// 		try {
// 			const sync = await reg.initSynchronizer_(syncTargetId);
// 			reg.synchronizers_[syncTargetId] = sync;
// 			reg.initSynchronizerStates_[syncTargetId] = 'ready';
// 			return sync;
// 		} catch (error) {
// 			reg.initSynchronizerStates_[syncTargetId] = 'error';
// 			throw error;
// 		}
// 	}
// }

// reg.syncHasAuth = (syncTargetId) => {
// 	return reg.syncTarget(syncTargetId).isAuthenticated();
// }

reg.scheduleSync = async (delay = null) => {
	if (delay === null) delay = 1000 * 3;

	if (reg.scheduleSyncId_) {
		clearTimeout(reg.scheduleSyncId_);
		reg.scheduleSyncId_ = null;
	}

	reg.logger().info('Scheduling sync operation...');

	// if (Setting.value('env') === 'dev') {
	// 	reg.logger().info('Scheduling sync operation DISABLED!!!');
	// 	return;
	// }

	const timeoutCallback = async () => {
		reg.scheduleSyncId_ = null;
		reg.logger().info('Doing scheduled sync');

		const syncTargetId = Setting.value('sync.target');

		if (!reg.syncTarget(syncTargetId).isAuthenticated()) {
			reg.logger().info('Synchroniser is missing credentials - manual sync required to authenticate.');
			return;
		}

		try {
			const sync = await reg.syncTarget(syncTargetId).synchronizer();

			const contextKey = 'sync.' + syncTargetId + '.context';
			let context = Setting.value(contextKey);
			context = context ? JSON.parse(context) : {};
			try {
				let newContext = await sync.start({ context: context });
				Setting.setValue(contextKey, JSON.stringify(newContext));
			} catch (error) {
				if (error.code == 'alreadyStarted') {
					reg.logger().info(error.message);
				} else {
					throw error;
				}
			}
		} catch (error) {
			reg.logger().info('Could not run background sync: ');
			reg.logger().info(error);
		}

		reg.setupRecurrentSync();
	};

	if (delay === 0) {
		timeoutCallback();
	} else {
		reg.scheduleSyncId_ = setTimeout(timeoutCallback, delay);
	}
}

// reg.syncStarted = async () => {
// 	return reg.syncTarget().syncStarted();
// }

reg.setupRecurrentSync = () => {
	if (reg.recurrentSyncId_) {
		shim.clearInterval(reg.recurrentSyncId_);
		reg.recurrentSyncId_ = null;
	}

	if (!Setting.value('sync.interval')) {
		reg.logger().debug('Recurrent sync is disabled');
	} else {
		reg.logger().debug('Setting up recurrent sync with interval ' + Setting.value('sync.interval'));

		reg.recurrentSyncId_ = shim.setInterval(() => {
			reg.logger().info('Running background sync on timer...');
			reg.scheduleSync(0);
		}, 1000 * Setting.value('sync.interval'));
	}
}

reg.setDb = (v) => {
	reg.db_ = v;
}

reg.db = () => {
	return reg.db_;
}

module.exports = { reg };