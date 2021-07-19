import FileApiDriverJoplinServer from './file-api-driver-joplinServer';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import JoplinServerApi from './JoplinServerApi';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import Logger from './Logger';

interface FileApiOptions {
	path(): string;
	userContentPath(): string;
	username(): string;
	password(): string;
}

export async function newFileApi(id: number, options: FileApiOptions) {
	const apiOptions = {
		baseUrl: () => options.path(),
		userContentBaseUrl: () => options.userContentPath(),
		username: () => options.username(),
		password: () => options.password(),
		env: Setting.value('env'),
	};

	const api = new JoplinServerApi(apiOptions);
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
		return `${_('Joplin Server')} (Beta)`;
	}

	public async isAuthenticated() {
		return true;
	}

	public async fileApi(): Promise<FileApi> {
		return super.fileApi();
	}

	public static async checkConfig(options: FileApiOptions, syncTargetId: number = null) {
		const output = {
			ok: false,
			errorMessage: '',
		};

		syncTargetId = syncTargetId === null ? SyncTargetJoplinServer.id() : syncTargetId;

		try {
			const fileApi = await newFileApi(syncTargetId, options);
			fileApi.requestRepeatCount_ = 0;

			await fileApi.put('testing.txt', 'testing');
			const result = await fileApi.get('testing.txt');
			if (result !== 'testing') throw new Error(`Could not access data on server "${options.path()}"`);
			await fileApi.delete('testing.txt');
			output.ok = true;
		} catch (error) {
			output.errorMessage = error.message;
			if (error.code) output.errorMessage += ` (Code ${error.code})`;
		}

		return output;
	}

	protected async initFileApi() {
		return initFileApi(SyncTargetJoplinServer.id(), this.logger(), {
			path: () => Setting.value('sync.9.path'),
			userContentPath: () => Setting.value('sync.9.userContentPath'),
			username: () => Setting.value('sync.9.username'),
			password: () => Setting.value('sync.9.password'),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
