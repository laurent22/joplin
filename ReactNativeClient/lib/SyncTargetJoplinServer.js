const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
// const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
// const WebDavApi = require('lib/WebDavApi');
// const { FileApiDriverWebDav } = require('lib/file-api-driver-webdav');

class SyncTargetJoplinServer extends BaseSyncTarget {

	static id() {
		return 8;
	}

	static supportsConfigCheck() {
		return true;
	}

	static targetName() {
		return 'joplinServer';
	}

	static label() {
		return _('Joplin Server');
	}

	async isAuthenticated() {
		return true;
	}

	// static async newFileApi_(syncTargetId, options) {
	// 	const apiOptions = {
	// 		baseUrl: () => options.path(),
	// 		username: () => options.username(),
	// 		password: () => options.password(),
	// 	};

	// 	return null;

	// 	// const api = new WebDavApi(apiOptions);
	// 	// const driver = new FileApiDriverWebDav(api);
	// 	// const fileApi = new FileApi('', driver);
	// 	// fileApi.setSyncTargetId(syncTargetId);
	// 	// return fileApi;
	// }

	static async checkConfig(options) {
		const fileApi = await SyncTargetJoplinServer.newFileApi_(SyncTargetJoplinServer.id(), options);
		fileApi.requestRepeatCount_ = 0;

		const output = {
			ok: false,
			errorMessage: '',
		};

		try {
			const result = await fileApi.stat('');
			if (!result) throw new Error(`Sync directory not found: ${options.path()}`);
			output.ok = true;
		} catch (error) {
			output.errorMessage = error.message;
			if (error.code) output.errorMessage += ` (Code ${error.code})`;
		}

		return output;
	}

	async initFileApi() {
		const fileApi = await SyncTargetJoplinServer.newFileApi_(SyncTargetJoplinServer.id(), {
			path: () => Setting.value('sync.8.path'),
			username: () => Setting.value('sync.8.username'),
			password: () => Setting.value('sync.8.password'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetJoplinServer;
