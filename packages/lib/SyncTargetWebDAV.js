
import BaseSyncTarget from './BaseSyncTarget';
import { _ } from './locale';
import Setting from './models/Setting';
import { FileApi } from './file-api.js';
import Synchronizer from './Synchronizer';
import WebDavApi from './WebDavApi';
import { FileApiDriverWebDav } from './file-api-driver-webdav';
import checkProviderIsSupported from './utils/webDAVUtils';
class SyncTargetWebDAV extends BaseSyncTarget {
	static id() {
		return 6;
	}

	static supportsConfigCheck() {
		return true;
	}

	static targetName() {
		return 'webdav';
	}

	static label() {
		return _('WebDAV');
	}

	static description() {
		return 'The WebDAV protocol allows users to create, change and move documents on a server. There are many WebDAV compatible servers, including SeaFile, Nginx or Apache.';
	}

	async isAuthenticated() {
		return true;
	}

	static requiresPassword() {
		return true;
	}

	static async newFileApi_(syncTargetId, options) {
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

	static async checkConfig(options) {
		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetWebDAV.id(), options);
		fileApi.requestRepeatCount_ = 0;

		const output = {
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

	async initFileApi() {
		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetWebDAV.id(), {
			path: () => Setting.value('sync.6.path'),
			username: () => Setting.value('sync.6.username'),
			password: () => Setting.value('sync.6.password'),
			ignoreTlsErrors: () => Setting.value('net.ignoreTlsErrors'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetWebDAV;
