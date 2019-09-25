const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const Setting = require('lib/models/Setting.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverMemory } = require('lib/file-api-driver-memory.js');
const { Synchronizer } = require('lib/synchronizer.js');

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
