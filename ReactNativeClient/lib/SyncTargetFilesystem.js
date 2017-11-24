const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const { Setting } = require('lib/models/setting.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { Synchronizer } = require('lib/synchronizer.js');

class SyncTargetFilesystem extends BaseSyncTarget {

	static id() {
		return 2;
	}

	static label() {
		return _('File system');
	}

	isAuthenticated() {
		return true;
	}

	async initFileApi() {
		const fileApi = new FileApi(Setting.value('sync.2.path'), new FileApiDriverLocal());
		fileApi.setLogger(this.logger());
		fileApi.setSyncTargetId(SyncTargetFilesystem.id());
		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}

}

module.exports = SyncTargetFilesystem;