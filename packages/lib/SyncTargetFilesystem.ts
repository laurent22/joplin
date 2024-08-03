import BaseSyncTarget from './BaseSyncTarget';
import { _ } from './locale';
import Setting from './models/Setting';
import { FileApi } from './file-api';
import FileApiDriverLocal from './file-api-driver-local';
import Synchronizer from './Synchronizer';

export default class SyncTargetFilesystem extends BaseSyncTarget {
	public static id() {
		return 2;
	}

	public static targetName() {
		return 'filesystem';
	}

	public static label() {
		return _('File system');
	}

	public static unsupportedPlatforms() {
		return ['ios'];
	}

	public async isAuthenticated() {
		return true;
	}

	private syncPath_() {
		return Setting.value('sync.2.path');
	}

	public async initFileApi() {
		const driver = new FileApiDriverLocal();

		const fileApi = new FileApi(() => {
			// The sync path can be set by the user after startup, so needs to be
			// determined dynamically.
			return this.syncPath_();
		}, driver);
		fileApi.setLogger(this.logger());
		fileApi.setSyncTargetId(SyncTargetFilesystem.id());

		const syncPath = this.syncPath_();
		await driver.mkdir(syncPath);
		return fileApi;
	}

	public async initSynchronizer() {
		const api = await this.fileApi();
		return new Synchronizer(this.db(), api, Setting.value('appType'));
	}
}

