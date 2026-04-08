const BaseSyncTarget = require('./BaseSyncTarget').default;
const { _ } = require('./locale');
const Setting = require('./models/Setting').default;
const { FileApi } = require('./file-api.js');
const Synchronizer = require('./Synchronizer').default;
const WebDavApi = require('./WebDavApi').default;
const OidcApi = require('./OidcApi').default;
const { FileApiDriverWebDav } = require('./file-api-driver-webdav');
const checkProviderIsSupported = require('./utils/webDAVUtils').default;

class SyncTargetWebDAV extends BaseSyncTarget {
	static authMethod_(syncTargetId, settings = null) {
		const key = `sync.${syncTargetId}.authMethod`;
		if (settings) {
			if (typeof settings.authMethod === 'function') return settings.authMethod() || 'password';
			if (typeof settings.authMethod === 'string') return settings.authMethod || 'password';
			if (key in settings) return settings[key] || 'password';
		}

		return Setting.value(key) || 'password';
	}

	static isOidcAuthMethod_(syncTargetId, settings = null) {
		return SyncTargetWebDAV.authMethod_(syncTargetId, settings) === 'oidc';
	}

	static newOidcApi_(syncTargetId, options, saveAuth = false) {
		const api = new OidcApi({
			issuer: options.oidcIssuer ? options.oidcIssuer() : Setting.value(`sync.${syncTargetId}.oidcIssuer`),
			clientId: options.oidcClientId ? options.oidcClientId() : Setting.value(`sync.${syncTargetId}.oidcClientId`),
			clientSecret: options.oidcClientSecret ? options.oidcClientSecret() : Setting.value(`sync.${syncTargetId}.oidcClientSecret`),
			scope: options.oidcScope ? options.oidcScope() : Setting.value(`sync.${syncTargetId}.oidcScope`),
		});

		const authString = options.auth ? options.auth() : Setting.value(`sync.${syncTargetId}.auth`);
		if (authString) {
			try {
				api.setAuth(JSON.parse(authString));
			} catch (error) {
				// Ignore invalid auth and let the user sign in again.
			}
		}

		if (saveAuth) {
			api.on('authRefreshed', auth => {
				Setting.setValue(`sync.${syncTargetId}.auth`, auth ? JSON.stringify(auth) : null);
			});
		}

		return api;
	}

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
		if (SyncTargetWebDAV.isOidcAuthMethod_(SyncTargetWebDAV.id())) {
			return !!Setting.value('sync.6.auth');
		}

		return true;
	}

	authRouteName() {
		if (Setting.value('appType') !== 'desktop') return null;
		if (!SyncTargetWebDAV.isOidcAuthMethod_(SyncTargetWebDAV.id())) return null;
		return 'WebDavOidcLogin';
	}

	static requiresPassword(settings = null) {
		return !SyncTargetWebDAV.isOidcAuthMethod_(SyncTargetWebDAV.id(), settings);
	}

	static async newFileApi_(syncTargetId, options) {
		const apiOptions = {
			baseUrl: () => options.path(),
			username: () => options.username(),
			password: () => options.password(),
			ignoreTlsErrors: () => options.ignoreTlsErrors(),
		};

		if (SyncTargetWebDAV.isOidcAuthMethod_(syncTargetId, options)) {
			const oidcApi = SyncTargetWebDAV.newOidcApi_(syncTargetId, options, true);
			apiOptions.authMethod = () => 'bearer';
			apiOptions.accessToken = async () => oidcApi.ensureValidAccessToken();
			apiOptions.onAuthError = async () => {
				await oidcApi.refreshAuthToken();
				return true;
			};
		}

		const api = new WebDavApi(apiOptions);
		const driver = new FileApiDriverWebDav(api);
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(syncTargetId);
		return fileApi;
	}

	static async checkConfig(options, syncTargetId = SyncTargetWebDAV.id()) {
		const output = {
			ok: false,
			errorMessage: '',
		};

		try {
			checkProviderIsSupported(options.path());
			if (SyncTargetWebDAV.isOidcAuthMethod_(syncTargetId, options)) {
				if (!options.oidcIssuer || !options.oidcIssuer()) throw new Error(_('OIDC issuer or discovery URL is missing'));
				if (!options.oidcClientId || !options.oidcClientId()) throw new Error(_('OIDC client ID is missing'));

				const oidcApi = SyncTargetWebDAV.newOidcApi_(syncTargetId, options);
				await oidcApi.discovery();

				if (Setting.value(`sync.${syncTargetId}.auth`)) {
					const fileApi = await SyncTargetWebDAV.newFileApi_(syncTargetId, options);
					fileApi.requestRepeatCount_ = 0;
					const result = await fileApi.stat('');
					if (!result) throw new Error(`WebDAV directory not found: ${options.path()}`);
				}
			} else {
				const fileApi = await SyncTargetWebDAV.newFileApi_(syncTargetId, options);
				fileApi.requestRepeatCount_ = 0;
				const result = await fileApi.stat('');
				if (!result) throw new Error(`WebDAV directory not found: ${options.path()}`);
			}
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
			authMethod: () => Setting.value('sync.6.authMethod'),
			username: () => Setting.value('sync.6.username'),
			password: () => Setting.value('sync.6.password'),
			auth: () => Setting.value('sync.6.auth'),
			oidcIssuer: () => Setting.value('sync.6.oidcIssuer'),
			oidcClientId: () => Setting.value('sync.6.oidcClientId'),
			oidcClientSecret: () => Setting.value('sync.6.oidcClientSecret'),
			oidcScope: () => Setting.value('sync.6.oidcScope'),
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
