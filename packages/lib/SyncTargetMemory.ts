import BaseSyncTarget from './BaseSyncTarget';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { FileApi } from './file-api';
import FileApiDriverMemory from './file-api-driver-memory';

export default class SyncTargetMemory extends BaseSyncTarget {
	public static id() {
		return 1;
	}

	public static targetName() {
		return 'memory';
	}

	public static label() {
		return 'Memory';
	}

	public async isAuthenticated() {
		return true;
	}

	public async initFileApi() {
		const fileApi = new FileApi('/root', new FileApiDriverMemory());
		fileApi.setLogger(this.logger());
		fileApi.setSyncTargetId(SyncTargetMemory.id());
		return fileApi;
	}

	public async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
