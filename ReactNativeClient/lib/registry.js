import { Logger } from 'lib/logger.js';
import { Setting } from 'lib/models/setting.js';
import { OneDriveApi } from 'lib/onedrive-api.js';
import { parameters } from 'lib/parameters.js';
import { FileApi } from 'lib/file-api.js';
import { Database } from 'lib/database.js';
import { Synchronizer } from 'lib/synchronizer.js';
import { FileApiDriverOneDrive } from 'lib/file-api-driver-onedrive.js';
import { shim } from 'lib/shim.js';
import { FileApiDriverMemory } from 'lib/file-api-driver-memory.js';
import { PoorManIntervals } from 'lib/poor-man-intervals.js';

const reg = {};

reg.logger = () => {
	if (!reg.logger_) {
		console.warn('Calling logger before it is initialized');
		return new Logger();
	}

	return reg.logger_;
}

reg.setLogger = (l) => {
	reg.logger_ = l;
}

reg.oneDriveApi = () => {
	if (reg.oneDriveApi_) return reg.oneDriveApi_;

	const isPublic = Setting.value('appType') != 'cli';

	reg.oneDriveApi_ = new OneDriveApi(parameters().oneDrive.id, parameters().oneDrive.secret, isPublic);
	reg.oneDriveApi_.setLogger(reg.logger());

	reg.oneDriveApi_.on('authRefreshed', (a) => {
		reg.logger().info('Saving updated OneDrive auth.');
		Setting.setValue('sync.3.auth', a ? JSON.stringify(a) : null);
	});

	let auth = Setting.value('sync.3.auth');
	if (auth) {
		try {
			auth = JSON.parse(auth);
		} catch (error) {
			reg.logger().warn('Could not parse OneDrive auth token');
			reg.logger().warn(error);
			auth = null;
		}

		reg.oneDriveApi_.setAuth(auth);
	}
	
	return reg.oneDriveApi_;
}

reg.synchronizer = async (syncTargetId) => {
	if (!reg.synchronizers_) reg.synchronizers_ = [];
	if (reg.synchronizers_[syncTargetId]) return reg.synchronizers_[syncTargetId];

	if (!reg.db()) throw new Error('Cannot initialize synchronizer: db not initialized');

	let fileApi = null;

	if (syncTargetId == Setting.SYNC_TARGET_ONEDRIVE) {

		if (!reg.oneDriveApi().auth()) throw new Error('User is not authentified');
		let appDir = await reg.oneDriveApi().appDirectory();
		fileApi = new FileApi(appDir, new FileApiDriverOneDrive(reg.oneDriveApi()));

	} else if (syncTargetId == Setting.SYNC_TARGET_MEMORY) {

		fileApi = new FileApi('joplin', new FileApiDriverMemory());

	} else if (syncTargetId == Setting.SYNC_TARGET_FILESYSTEM) {

		let syncDir = Setting.value('sync.2.path');
		if (!syncDir) throw new Error(_('Please set the "sync.2.path" config value to the desired synchronisation destination.'));
		await shim.fs.mkdirp(syncDir, 0o755);
		fileApi = new FileApi(syncDir, new shim.FileApiDriverLocal());

	} else {

		throw new Error('Unknown sync target: ' + syncTargetId);

	}

	fileApi.setSyncTargetId(syncTargetId);
	fileApi.setLogger(reg.logger());

	let sync = new Synchronizer(reg.db(), fileApi, Setting.value('appType'));
	sync.setLogger(reg.logger());
	sync.dispatch = reg.dispatch;

	reg.synchronizers_[syncTargetId] = sync;

	return sync;
}

reg.syncHasAuth = (syncTargetId) => {
	if (syncTargetId == Setting.SYNC_TARGET_ONEDRIVE && !reg.oneDriveApi().auth()) {
		return false;
	}

	return true;
}

reg.scheduleSync = async (delay = null) => {
	if (delay === null) delay = 1000 * 10;

	if (reg.scheduleSyncId_) {
		clearTimeout(reg.scheduleSyncId_);
		reg.scheduleSyncId_ = null;
	}

	reg.logger().info('Scheduling sync operation...');

	const timeoutCallback = async () => {
		reg.scheduleSyncId_ = null;
		reg.logger().info('Doing scheduled sync');

		const syncTargetId = Setting.value('sync.target');

		if (!reg.syncHasAuth(syncTargetId)) {
			reg.logger().info('Synchroniser is missing credentials - manual sync required to authenticate.');
			return;
		}

		const sync = await reg.synchronizer(syncTargetId);

		let context = Setting.value('sync.context');
		context = context ? JSON.parse(context) : {};
		try {
			let newContext = await sync.start({ context: context });
			Setting.setValue('sync.context', JSON.stringify(newContext));
		} catch (error) {
			if (error.code == 'alreadyStarted') {
				reg.logger().info(error.message);
			} else {
				throw error;
			}
		}

		reg.setupRecurrentSync();
	};

	if (delay === 0) {
		timeoutCallback();
	} else {
		reg.scheduleSyncId_ = setTimeout(timeoutCallback, delay);
	}
}

reg.syncStarted = async () => {
	const syncTarget = Setting.value('sync.target');
	if (!reg.syncHasAuth(syncTarget)) return false;
	const sync = await reg.synchronizer(syncTarget);
	return sync.state() != 'idle';
}

reg.setupRecurrentSync = () => {
	if (reg.recurrentSyncId_) {
		PoorManIntervals.clearInterval(reg.recurrentSyncId_);
		reg.recurrentSyncId_ = null;
	}

	reg.logger().debug('Setting up recurrent sync with interval ' + Setting.value('sync.interval'));

	reg.recurrentSyncId_ = PoorManIntervals.setInterval(() => {
		reg.logger().info('Running background sync on timer...');
		reg.scheduleSync(0);
	}, 1000 * Setting.value('sync.interval'));
}

reg.setDb = (v) => {
	reg.db_ = v;
}

reg.db = () => {
	return reg.db_;
}

export { reg }