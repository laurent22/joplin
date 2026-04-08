// The Nextcloud sync target is essentially a wrapper over the WebDAV sync target,
// thus all the calls to SyncTargetWebDAV to avoid duplicate code.

const BaseSyncTarget = require('./BaseSyncTarget').default;
const { _ } = require('./locale');
const Setting = require('./models/Setting').default;
const Synchronizer = require('./Synchronizer').default;
const SyncTargetWebDAV = require('./SyncTargetWebDAV');

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

	static description() {
		return 'A suite of client-server software for creating and using file hosting services.';
	}

	async isAuthenticated() {
		if (SyncTargetWebDAV.isOidcAuthMethod_(SyncTargetNextcloud.id())) {
			return !!Setting.value('sync.5.auth');
		}

		return true;
	}

	authRouteName() {
		if (Setting.value('appType') !== 'desktop') return null;
		if (!SyncTargetWebDAV.isOidcAuthMethod_(SyncTargetNextcloud.id())) return null;
		return 'WebDavOidcLogin';
	}

	static requiresPassword(settings = null) {
		return !SyncTargetWebDAV.isOidcAuthMethod_(SyncTargetNextcloud.id(), settings);
	}

	static async checkConfig(options) {
		return SyncTargetWebDAV.checkConfig(options, SyncTargetNextcloud.id());
	}

	async initFileApi() {
		const fileApi = await SyncTargetWebDAV.newFileApi_(SyncTargetNextcloud.id(), {
			path: () => Setting.value('sync.5.path'),
			authMethod: () => Setting.value('sync.5.authMethod'),
			username: () => Setting.value('sync.5.username'),
			password: () => Setting.value('sync.5.password'),
			auth: () => Setting.value('sync.5.auth'),
			oidcIssuer: () => Setting.value('sync.5.oidcIssuer'),
			oidcClientId: () => Setting.value('sync.5.oidcClientId'),
			oidcClientSecret: () => Setting.value('sync.5.oidcClientSecret'),
			oidcScope: () => Setting.value('sync.5.oidcScope'),
			ignoreTlsErrors: () => Setting.value('net.ignoreTlsErrors'),
		});

		fileApi.setLogger(this.logger());

		return fileApi;
	}

	async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}

}

module.exports = SyncTargetNextcloud;
