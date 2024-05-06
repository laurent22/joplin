import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import SyncTargetJoplinServer, { initFileApi } from './SyncTargetJoplinServer';

interface FileApiOptions {
	path(): string;
	userContentPath(): string;
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

	public static description() {
		return _('Joplin\'s own sync service. Also gives access to Joplin-specific features such as publishing notes or collaborating on notebooks with others.');
	}

	public static supportsSelfHosted(): boolean {
		return false;
	}

	public static supportsRecursiveLinkedNotes(): boolean {
		// Not currently working:
		// https://github.com/laurent22/joplin/pull/6661
		// https://github.com/laurent22/joplin/pull/6600
		return false;
	}

	public static override supportsShare(): boolean {
		return true;
	}

	public async isAuthenticated() {
		try {
			const fileApi = await this.fileApi();
			const api = fileApi.driver().api();
			const sessionId = await api.sessionId();
			return !!sessionId;
		} catch (error) {
			if (error.code === 403) return false;
			throw error;
		}
	}

	public authRouteName() {
		return 'JoplinCloudLogin';
	}

	public static requiresPassword() {
		return true;
	}

	public async fileApi(): Promise<FileApi> {
		return super.fileApi();
	}

	public static async checkConfig(options: FileApiOptions) {
		return SyncTargetJoplinServer.checkConfig({
			...options,
		}, SyncTargetJoplinCloud.id());
	}

	protected async initFileApi() {
		return initFileApi(SyncTargetJoplinCloud.id(), this.logger(), {
			path: () => Setting.value('sync.10.path'),
			userContentPath: () => Setting.value('sync.10.userContentPath'),
			username: () => Setting.value('sync.10.username'),
			password: () => Setting.value('sync.10.password'),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
