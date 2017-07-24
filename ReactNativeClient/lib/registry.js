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
		Setting.setValue('sync.onedrive.auth', a ? JSON.stringify(a) : null);
	});

	let auth = Setting.value('sync.onedrive.auth');
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

	if (syncTargetId == 'onedrive') {

		if (!reg.oneDriveApi().auth()) throw new Error('User is not authentified');
		let appDir = await reg.oneDriveApi().appDirectory();
		fileApi = new FileApi(appDir, new FileApiDriverOneDrive(reg.oneDriveApi()));

	} else if (syncTargetId == 'memory') {

		fileApi = new FileApi('joplin', new FileApiDriverMemory());

	} else if (syncTargetId == 'filesystem') {

		let syncDir = Setting.value('sync.filesystem.path');
		if (!syncDir) throw new Error(_('Please set the "sync.filesystem.path" config value to the desired synchronisation destination.'));
		await shim.fs.mkdirp(syncDir, 0o755);
		fileApi = new FileApi(syncDir, new shim.FileApiDriverLocal());

	} else {

		throw new Error('Unknown sync target: ' + syncTargetId);

	}

	fileApi.setLogger(reg.logger());

	let sync = new Synchronizer(reg.db(), fileApi, Setting.value('appType'));
	sync.setLogger(reg.logger());
	sync.dispatch = reg.dispatch;

	reg.synchronizers_[syncTargetId] = sync;

	return sync;
}

reg.scheduleSync = async (delay = null) => {
	if (delay === null) delay = 1000 * 10;

	if (reg.scheduleSyncId_) {
		clearTimeout(reg.scheduleSyncId_);
		reg.scheduleSyncId_ = null;
	}

	reg.logger().info('Scheduling sync operation...');

	reg.scheduleSyncId_ = setTimeout(async () => {
		reg.scheduleSyncId_ = null;
		reg.logger().info('Doing scheduled sync');

		if (!reg.oneDriveApi().auth()) {
			reg.logger().info('Synchronizer is missing credentials - manual sync required to authenticate.');
			return;
		}

		const sync = await reg.synchronizer();

		let context = Setting.value('sync.context');
		context = context ? JSON.parse(context) : {};
		let newContext = await sync.start({ context: context });
		Setting.setValue('sync.context', JSON.stringify(newContext));
	}, delay);
}

reg.setDb = (v) => {
	reg.db_ = v;
}

reg.db = () => {
	return reg.db_;
}

export { reg }