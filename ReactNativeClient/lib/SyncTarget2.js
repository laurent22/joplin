const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const { Setting } = require('lib/models/setting.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const { Synchronizer } = require('lib/synchronizer.js');

class SyncTarget2 extends BaseSyncTarget {

	id() {
		return 2;
	}

	name() {
		return 'filesystem';
	}

	label() {
		return _('File system');
	}

	isAuthenticated() {
		return true;
	}

	initFileApi() {
		const fileApi = new FileApi(Setting.value('sync.2.path'), new FileApiDriverLocal());
		fileApi.setLogger(this.logger());
		fileApi.setSyncTargetId(this.id());
		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), this.fileApi(), Setting.value('appType'));
	}

}

module.exports = SyncTarget2;