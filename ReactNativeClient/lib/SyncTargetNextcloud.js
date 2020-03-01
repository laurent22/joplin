// The Nextcloud sync target is essentially a wrapper over the WebDAV sync target,
// thus all the calls to SyncTargetWebDAV to avoid duplicate code.

const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const { Synchronizer } = require('lib/synchronizer.js');
const SyncTargetWebDAV = require('lib/SyncTargetWebDAV');
const JoplinServerApi = require('lib/JoplinServerApi.js').default;

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

	async isAuthenticated() {
		return true;
	}

	static async checkConfig(options) {
		return SyncTargetWebDAV.checkConfig(options);
	}

	async initFileApi() {
		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetNextcloud.id(), {
			path: () => Setting.value('sync.5.path'),
			username: () => Setting.value('sync.5.username'),
			password: () => Setting.value('sync.5.password'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}

	async appApi(settings = null) {
		const useCache = !settings;

		if (this.appApi_ && useCache) return this.appApi_;

		const appApi = new JoplinServerApi({
			baseUrl: () => JoplinServerApi.baseUrlFromNextcloudWebDavUrl(settings ? settings['sync.5.path'] : Setting.value('sync.5.path')),
			username: () => settings ? settings['sync.5.username'] : Setting.value('sync.5.username'),
			password: () => settings ? settings['sync.5.password'] : Setting.value('sync.5.password'),
		});

		appApi.setLogger(this.logger());

		if (useCache) this.appApi_ = appApi;

		return appApi;
	}

}

module.exports = SyncTargetNextcloud;
