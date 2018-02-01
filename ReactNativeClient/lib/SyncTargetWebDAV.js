const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const WebDavApi = require('lib/WebDavApi');
const { FileApiDriverWebDav } = require('lib/file-api-driver-webdav');

class SyncTargetWebDAV extends BaseSyncTarget {

	static id() {
		return 6;
	}

	constructor(db, options = null) {
		super(db, options);
	}

	static targetName() {
		return 'webdav';
	}

	static label() {
		return _('WebDAV (Beta)');
	}

	isAuthenticated() {
		return true;
	}

	async initFileApi() {
		const options = {
			baseUrl: () => Setting.value('sync.6.path'),
			username: () => Setting.value('sync.6.username'),
			password: () => Setting.value('sync.6.password'),
		};

		const api = new WebDavApi(options);
		const driver = new FileApiDriverWebDav(api);
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(SyncTargetWebDAV.id());
		fileApi.setLogger(this.logger());
		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}

}

module.exports = SyncTargetWebDAV;