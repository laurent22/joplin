const BaseSyncTarget = require('./BaseSyncTarget').default;
const Setting = require('./models/Setting').default;
const { FileApi } = require('./file-api.js');
const FileApiDriverMemory = require('./file-api-driver-memory').default;
const Synchronizer = require('./Synchronizer').default;

class SyncTargetMemory extends BaseSyncTarget {
	static id() {
		return 1;
	}

	static targetName() {
		return 'memory';
	}

	static label() {
		return 'Memory';
	}

	async isAuthenticated() {
		return true;
	}

	initFileApi() {
		const fileApi = new FileApi('/root', new FileApiDriverMemory());
		fileApi.setLogger(this.logger());
		fileApi.setSyncTargetId(SyncTargetMemory.id());
		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetMemory;
