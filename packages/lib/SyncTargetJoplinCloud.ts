import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import SyncTargetJoplinServer from './SyncTargetJoplinServer';
import JoplinCloudApi from './JoplinCloudApi';
import FileApiDriverJoplinServer from './file-api-driver-joplinServer';
import Logger from '@joplin/utils/Logger';

interface FileApiOptions {
	path(): string;
	userContentPath(): string;
	id(): string;
	password(): string;
}

export async function newFileApi(id: number, options: FileApiOptions) {
	const apiOptions = {
		baseUrl: () => options.path(),
		userContentBaseUrl: () => options.userContentPath(),
		password: () => options.password(),
		env: Setting.value('env'),
		username: () => options.id(),
	};

	const api = new JoplinCloudApi(apiOptions);
	const driver = new FileApiDriverJoplinServer(api);
	const fileApi = new FileApi('', driver);
	fileApi.setSyncTargetId(id);
	await fileApi.initialize();
	return fileApi;
}

export async function initFileApi(syncTargetId: number, logger: Logger, options: FileApiOptions) {
	const fileApi = await newFileApi(syncTargetId, options);
	fileApi.setLogger(logger);
	return fileApi;
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
		return true;
	}

	public static requiresPassword() {
		return true;
	}

	public async fileApi(): Promise<FileApi> {
		return super.fileApi();
	}

	public static async checkConfig() {
		return true;
		// return SyncTargetJoplinServer.checkConfig({
		// 	...options,
		// }, SyncTargetJoplinCloud.id());
	}

	protected async initFileApi() {
		return initFileApi(SyncTargetJoplinCloud.id(), this.logger(), {
			path: () => Setting.value('sync.10.path'),
			userContentPath: () => Setting.value('sync.10.userContentPath'),
			id: () => Setting.value('sync.10.id'),
			password: () => Setting.value('sync.10.password'),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
