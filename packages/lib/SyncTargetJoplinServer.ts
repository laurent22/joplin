import FileApiDriverJoplinServer from './file-api-driver-joplinServer';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import JoplinServerApi from './JoplinServerApi';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';

interface FileApiOptions {
	path(): string;
	username(): string;
	password(): string;
	directory(): string;
}

export default class SyncTargetJoplinServer extends BaseSyncTarget {

	public static id() {
		return 9;
	}

	public static supportsConfigCheck() {
		return true;
	}

	public static targetName() {
		return 'joplinServer';
	}

	public static label() {
		return _('Joplin Server');
	}

	public async isAuthenticated() {
		return true;
	}

	public async fileApi(): Promise<FileApi> {
		return super.fileApi();
	}

	private static async newFileApi_(options: FileApiOptions) {
		const apiOptions = {
			baseUrl: () => options.path(),
			username: () => options.username(),
			password: () => options.password(),
		};

		const api = new JoplinServerApi(apiOptions);
		const driver = new FileApiDriverJoplinServer(api);
		const fileApi = new FileApi(options.directory, driver);
		fileApi.setSyncTargetId(this.id());
		await fileApi.initialize();
		return fileApi;
	}

	public static async checkConfig(options: FileApiOptions) {
		const output = {
			ok: false,
			errorMessage: '',
		};

		try {
			const fileApi = await SyncTargetJoplinServer.newFileApi_(options);
			fileApi.requestRepeatCount_ = 0;

			const result = await fileApi.stat('');
			if (!result) throw new Error(`Sync directory not found: "${options.directory()}" on server "${options.path()}"`);
			output.ok = true;
		} catch (error) {
			output.errorMessage = error.message;
			if (error.code) output.errorMessage += ` (Code ${error.code})`;
		}

		return output;
	}

	protected async initFileApi() {
		const fileApi = await SyncTargetJoplinServer.newFileApi_({
			path: () => Setting.value('sync.9.path'),
			username: () => Setting.value('sync.9.username'),
			password: () => Setting.value('sync.9.password'),
			directory: () => Setting.value('sync.9.directory'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
