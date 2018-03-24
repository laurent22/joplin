const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const DropboxApi = require('lib/DropboxApi');
const Setting = require('lib/models/Setting.js');
const { parameters } = require('lib/parameters.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApiDriverDropbox } = require('lib/file-api-driver-dropbox.js');

class SyncTargetDropbox extends BaseSyncTarget {

	static id() {
		return 7;
	}

	constructor(db, options = null) {
		super(db, options);
		this.api_ = null;
	}

	static targetName() {
		return 'dropbox';
	}

	static label() {
		return _('Dropbox');
	}

	isAuthenticated() {
		const f = this.fileApiSync();
		return f && f.driver().api().authToken();
	}

	syncTargetId() {
		return SyncTargetDropbox.id();
	}

	async initFileApi() {
		const api = new DropboxApi();
		const appDir = '';
		const fileApi = new FileApi(appDir, new FileApiDriverDropbox(api));
		fileApi.setSyncTargetId(this.syncTargetId());
		fileApi.setLogger(this.logger());
		return fileApi;
	}

	async initSynchronizer() {
		if (!this.isAuthenticated()) throw new Error('User is not authentified');
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}

}

module.exports = SyncTargetDropbox;