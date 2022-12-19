const BaseSyncTarget = require('./BaseSyncTarget').default;
const { _ } = require('./locale');
const Setting = require('./models/Setting').default;
const { FileApi } = require('./file-api.js');
const { FileApiDriverLocal } = require('./file-api-driver-local');
const Synchronizer = require('./Synchronizer').default;

class SyncTargetFilesystem extends BaseSyncTarget {
	static id() {
		return 2;
	}

	static targetName() {
		return 'filesystem';
	}

	static label() {
		return _('File system');
	}

	static unsupportedPlatforms() {
		return ['ios'];
	}

	async isAuthenticated() {
		return true;
	}

	async initFileApi() {
		const syncPath = Setting.value('sync.2.path');
		const driver = new FileApiDriverLocal();
		const fileApi = new FileApi(syncPath, driver);
		fileApi.setLogger(this.logger());
		fileApi.setSyncTargetId(SyncTargetFilesystem.id());
		await driver.mkdir(syncPath);
		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetFilesystem;
