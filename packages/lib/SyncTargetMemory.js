
import BaseSyncTarget from './BaseSyncTarget';
import Setting from './models/Setting';
import { FileApi } from './file-api.js';
import FileApiDriverMemory from './file-api-driver-memory';
import Synchronizer from './Synchronizer';
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
