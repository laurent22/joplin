const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { Synchronizer } = require('lib/synchronizer.js');

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
