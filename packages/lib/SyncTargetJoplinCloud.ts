import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import SyncTargetJoplinServer, { initFileApi } from './SyncTargetJoplinServer';
import shim from './shim';
import { getApplicationInformation } from './services/JoplinCloudLogin';

interface FileApiOptions {
	path(): string;
	userContentPath(): string;
	username(): string;
	password(): string;
	platform(): number | undefined;
	type(): number | undefined;
	version(): string | undefined;
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

	public async isAuthenticated() {
		try {
			const fileApi = await this.fileApi();
			const api = fileApi.driver().api();
			const sessionId = await api.sessionId();
			return Boolean(sessionId);
		} catch (error) {
			return false;
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
		const { type, platform } = await getApplicationInformation();
		return SyncTargetJoplinServer.checkConfig({
			...options,
			platform: () => platform,
			type: () => type,
			version: () => shim.appVersion(),
		}, SyncTargetJoplinCloud.id());
	}

	protected async initFileApi() {
		const { type, platform } = await getApplicationInformation();
		return initFileApi(SyncTargetJoplinCloud.id(), this.logger(), {
			path: () => Setting.value('sync.10.path'),
			userContentPath: () => Setting.value('sync.10.userContentPath'),
			username: () => Setting.value('sync.10.username'),
			password: () => Setting.value('sync.10.password'),
			platform: () => platform,
			type: () => type,
			version: () => shim.appVersion(),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
