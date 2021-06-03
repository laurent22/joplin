import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import SyncTargetJoplinServer, { initFileApi } from './SyncTargetJoplinServer';

interface FileApiOptions {
	path(): string;
	username(): string;
	password(): string;
}

export default class SyncTargetJoplinCloud extends BaseSyncTarget {

	public static id() {
		return 10;
	}

	public static supportsConfigCheck() {
		return SyncTargetJoplinServer.supportsConfigCheck();
	}

	public static targetName() {
		return 'joplinCloud';
	}

	public static label() {
		return _('Joplin Cloud');
	}

	public async isAuthenticated() {
		return true;
	}

	public async fileApi(): Promise<FileApi> {
		return super.fileApi();
	}

	public static async checkConfig(options: FileApiOptions) {
		return SyncTargetJoplinServer.checkConfig({
			...options,
		});
	}

	protected async initFileApi() {
		return initFileApi(this.logger(), {
			path: () => Setting.value('sync.10.path'),
			username: () => Setting.value('sync.10.username'),
			password: () => Setting.value('sync.10.password'),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
