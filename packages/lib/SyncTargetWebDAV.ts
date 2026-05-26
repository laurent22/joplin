import BaseSyncTarget, { CheckConfigResult } from './BaseSyncTarget';
import { _ } from './locale';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import WebDavApi from './WebDavApi';
import { FileApi } from './file-api';
import checkProviderIsSupported from './utils/webDAVUtils';
const { FileApiDriverWebDav } = require('./file-api-driver-webdav');

export interface WebDavFileApiOptions {
	path(): string;
	username(): string;
	password(): string;
	ignoreTlsErrors(): boolean;
}

export default class SyncTargetWebDAV extends BaseSyncTarget {

	public static id() {
		return 6;
	}

	public static supportsConfigCheck() {
		return true;
	}

	public static targetName() {
		return 'webdav';
	}

	public static label() {
		return _('WebDAV');
	}

	public static description() {
		return 'The WebDAV protocol allows users to create, change and move documents on a server. There are many WebDAV compatible servers, including SeaFile, Nginx or Apache.';
	}

	public async isAuthenticated() {
		return true;
	}

	public static requiresPassword() {
		return true;
	}

	public static async newFileApi_(syncTargetId: number, options: WebDavFileApiOptions) {
		const apiOptions = {
			baseUrl: () => options.path(),
			username: () => options.username(),
			password: () => options.password(),
			ignoreTlsErrors: () => options.ignoreTlsErrors(),
		};

		const api = new WebDavApi(apiOptions);
		const driver = new FileApiDriverWebDav(api);
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(syncTargetId);
		return fileApi;
	}

	public static override async checkConfig(options: WebDavFileApiOptions): Promise<CheckConfigResult> {
		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetWebDAV.id(), options);
		fileApi.requestRepeatCount_ = 0;

		const output: CheckConfigResult = {
			ok: false,
			errorMessage: '',
		};

		try {
			checkProviderIsSupported(options.path());
			const result = await fileApi.stat('');
			if (!result) throw new Error(`WebDAV directory not found: ${options.path()}`);
			output.ok = true;
		} catch (error) {
			output.errorMessage = error.message;
			if (error.code) output.errorMessage += ` (Code ${error.code})`;
		}

		return output;
	}

	public async initFileApi() {
		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetWebDAV.id(), {
			path: () => Setting.value('sync.6.path'),
			username: () => Setting.value('sync.6.username'),
			password: () => Setting.value('sync.6.password'),
			ignoreTlsErrors: () => Setting.value('net.ignoreTlsErrors'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	public async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
