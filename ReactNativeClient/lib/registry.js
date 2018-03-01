const { Logger } = require('lib/logger.js');
const Setting = require('lib/models/Setting.js');
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

reg.setShowErrorMessageBoxHandler = (v) => {
	reg.showErrorMessageBoxHandler_ = v;
}

reg.showErrorMessageBox = (message) => {
	if (!reg.showErrorMessageBoxHandler_) return;
	reg.showErrorMessageBoxHandler_(message);
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
	if (delay === null) delay = 1000 * 10;

	let promiseResolve = null;
	const promise = new Promise((resolve, reject) => {
		promiseResolve = resolve;
	});

	if (reg.scheduleSyncId_) {
		clearTimeout(reg.scheduleSyncId_);
		reg.scheduleSyncId_ = null;
	}

	reg.logger().info('Scheduling sync operation...');

	if (Setting.value('env') === 'dev' && delay !== 0) {
		reg.logger().info('Schedule sync DISABLED!!!');
		return;
	}

	const timeoutCallback = async () => {
		reg.scheduleSyncId_ = null;
		reg.logger().info('Preparing scheduled sync');

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
			try {
				context = context ? JSON.parse(context) : {};
			} catch (error) {
				// Clearing the context is inefficient since it means all items are going to be re-downloaded
				// however it won't result in duplicate items since the synchroniser is going to compare each
				// item to the current state.
				reg.logger().warn('Could not parse JSON sync context ' + contextKey + ':', context);
				reg.logger().info('Clearing context and starting from scratch');
				context = null;
			}

			try {
				reg.logger().info('Starting scheduled sync');
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
			reg.logger().info('Could not run background sync:');
			reg.logger().info(error);

			// Special case to display OneDrive Business error. This is the full error that's received when trying to use a OneDrive Business account:
			//
			// {"error":"invalid_client","error_description":"AADSTS50011: The reply address 'http://localhost:1917' does not match the reply addresses configured for
			// the application: 'cbabb902-d276-4ea4-aa88-062a5889d6dc'. More details: not specified\r\nTrace ID: 6e63dac6-8b37-47e2-bd1b-4768f8713400\r\nCorrelation
			// ID: acfd6503-8d97-4349-ae2e-e7a19dd7b6bc\r\nTimestamp: 2017-12-01 13:35:55Z","error_codes":[50011],"timestamp":"2017-12-01 13:35:55Z","trace_id":
			// "6e63dac6-8b37-47e2-bd1b-4768f8713400","correlation_id":"acfd6503-8d97-4349-ae2e-e7a19dd7b6bc"}: TOKEN: null Error: {"error":"invalid_client",
			// "error_description":"AADSTS50011: The reply address 'http://localhost:1917' does not match the reply addresses configured for the application:
			// 'cbabb902-d276-4ea4-aa88-062a5889d6dc'. More details: not specified\r\nTrace ID: 6e63dac6-8b37-47e2-bd1b-4768f8713400\r\nCorrelation ID
			//  acfd6503-8d97-4349-ae2e-e7a19dd7b6bc\r\nTimestamp: 2017-12-01 13:35:55Z","error_codes":[50011],"timestamp":"2017-12-01 13:35:55Z","trace_id":
			// "6e63dac6-8b37-47e2-bd1b-4768f8713400","correlation_id":"acfd6503-8d97-4349-ae2e-e7a19dd7b6bc"}
			if (error && error.message && error.message.indexOf('"invalid_client"') >= 0) {
				reg.showErrorMessageBox(_('Could not synchronize with OneDrive.\n\nThis error often happens when using OneDrive for Business, which unfortunately cannot be supported.\n\nPlease consider using a regular OneDrive account.'));
			}
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

		if (Setting.value('env') === 'dev') {
			reg.logger().info('Recurrent sync operation DISABLED!!!');
			return;
		}

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