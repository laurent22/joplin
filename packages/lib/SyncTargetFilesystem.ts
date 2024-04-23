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

	public async initFileApi() {
		const syncPath = Setting.value('sync.2.path');
		const driver = new FileApiDriverLocal();
		const fileApi = new FileApi(syncPath, driver);
		fileApi.setLogger(this.logger());
		fileApi.setSyncTargetId(SyncTargetFilesystem.id());
		await driver.mkdir(syncPath);
		return fileApi;
	}

	public async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

