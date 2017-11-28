const { Logger } = require('lib/logger.js');
const { Setting } = require('lib/models/setting.js');
const { shim } = require('lib/shim.js');
const SyncTargetRegistry = require('lib/SyncTargetRegistry.js');
const { _ } = require('lib/locale.js');

const reg = {};

reg.syncTargets_ = {};

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

	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
	if (!reg.db()) throw new Error('Cannot initialize sync without a db');

	const target = new SyncTargetClass(reg.db());
	target.setLogger(reg.logger());
	reg.syncTargets_[syncTargetId] = target;
	return target;
}

reg.scheduleSync = async (delay = null) => {
	if (delay === null) delay = 1000 * 3;

	let promiseResolve = null;
	const promise = new Promise((resolve, reject) => {
		promiseResolve = resolve;
	});

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
			promiseResolve();
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
					promiseResolve();
					throw error;
				}
			}
		} catch (error) {
			reg.logger().info('Could not run background sync: ');
			reg.logger().info(error);
		}

		reg.setupRecurrentSync();

		promiseResolve();
	};

	if (delay === 0) {
		timeoutCallback();
	} else {
		reg.scheduleSyncId_ = setTimeout(timeoutCallback, delay);
	}

	return promise;
}

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