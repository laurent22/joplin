const BaseSyncTarget = require('./BaseSyncTarget').default;
const { _ } = require('./locale');
const Setting = require('./models/Setting').default;
const { FileApi } = require('./file-api.js');
const Synchronizer = require('./Synchronizer').default;
const WebDavApi = require('./WebDavApi');
const { FileApiDriverWebDav } = require('./file-api-driver-webdav');

class SyncTargetSwissDisk extends BaseSyncTarget {
	static id() {
		return 11;
	}

	static supportsConfigCheck() {
		return true;
	}

	static targetName() {
		return 'swissdisk';
	}

	static label() {
		return _('SwissDisk');
	}

	static description() {
		return 'A secure encrypted file sync and share service.';
	}

	async isAuthenticated() {
		return true;
	}

	static async newFileApi_(syncTargetId, options) {
		const apiOptions = {
			baseUrl: () => `https://disk.swissdisk.com/${options.username()}/${options.path()}`,
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
		const fileApi = await SyncTargetSwissDisk.newFileApi_(SyncTargetSwissDisk.id(), options);
		fileApi.requestRepeatCount_ = 0;

		const output = {
			ok: false,
			errorMessage: '',
		};

		try {
			const result = await fileApi.stat('');
			if (!result) throw new Error(`SwissDisk directory not found: ${options.path()}`);
			output.ok = true;
		} catch (error) {
			output.errorMessage = error.message;
			if (error.code) output.errorMessage += ` (Code ${error.code})`;
		}

		return output;
	}

	async initFileApi() {
		const fileApi = await SyncTargetSwissDisk.newFileApi_(SyncTargetSwissDisk.id(), {
			path: () => Setting.value('sync.11.path'),
			username: () => Setting.value('sync.11.username'),
			password: () => Setting.value('sync.11.password'),
			ignoreTlsErrors: () => Setting.value('net.ignoreTlsErrors'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetSwissDisk;
