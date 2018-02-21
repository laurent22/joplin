// The Nextcloud sync target is essentially a wrapper over the WebDAV sync target,
// thus all the calls to SyncTargetWebDAV to avoid duplicate code.

const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const WebDavApi = require('lib/WebDavApi');
const SyncTargetWebDAV = require('lib/SyncTargetWebDAV');
const { FileApiDriverWebDav } = require('lib/file-api-driver-webdav');

class SyncTargetNextcloud extends BaseSyncTarget {

	static id() {
		return 5;
	}

	static supportsConfigCheck() {
		return true;
	}

	static targetName() {
		return 'nextcloud';
	}

	static label() {
		return _('Nextcloud');
	}

	isAuthenticated() {
		return true;
	}

	static async checkConfig(options) {
		return SyncTargetWebDAV.checkConfig(options);
	}

	async initFileApi() {
		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetNextcloud.id(), {
			path: Setting.value('sync.5.path'),
			username: Setting.value('sync.5.username'),
			password: Setting.value('sync.5.password'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}

}

module.exports = SyncTargetNextcloud;