import BaseSyncTarget, { CheckConfigResult } from './BaseSyncTarget';
import { _ } from './locale';
import Setting from './models/Setting';
import { FileApi } from './file-api';
import Synchronizer from './Synchronizer';
import WebDavApi, { WebDavAuthType } from './WebDavApi';
import checkProviderIsSupported from './utils/webDAVUtils';
import OidcApi, { OidcAuth } from './OidcApi';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const { FileApiDriverWebDav } = require('./file-api-driver-webdav');

interface WebDavOptions {
	path(): string;
	username(): string;
	password(): string;
	ignoreTlsErrors(): boolean;
	authType?(): string;
	oidcIssuerUrl?(): string;
	oidcClientId?(): string;
	oidcClientSecret?(): string;
	oidcAuth?(): string;
}

export default class SyncTargetWebDAV extends BaseSyncTarget {
	private oidcApi_: OidcApi | null = null;

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
		const authType = Setting.value('sync.6.authType');
		if (authType === 'oidc') {
			const oidcAuth = Setting.value('sync.6.oidcAuth');
			return !!oidcAuth;
		}
		return true;
	}

	public static requiresPassword() {
		return true;
	}

	public authRouteName(): string | null {
		const authType = Setting.value('sync.6.authType');
		if (authType === 'oidc') {
			return 'WebDavOidcLogin';
		}
		return null;
	}

	private oidcApi(): OidcApi {
		if (!this.oidcApi_) {
			this.oidcApi_ = new OidcApi({
				issuerUrl: Setting.value('sync.6.oidcIssuerUrl'),
				clientId: Setting.value('sync.6.oidcClientId'),
				clientSecret: Setting.value('sync.6.oidcClientSecret'),
			});

			// Load existing auth if available
			const authJson = Setting.value('sync.6.oidcAuth');
			if (authJson) {
				try {
					const auth = JSON.parse(authJson) as OidcAuth;
					this.oidcApi_.setAuth(auth);
				} catch (e) {
					// Invalid auth JSON, ignore
				}
			}

			// Save auth when refreshed
			this.oidcApi_.on('authRefreshed', (auth: OidcAuth | null) => {
				Setting.setValue('sync.6.oidcAuth', auth ? JSON.stringify(auth) : '');
			});
		}
		return this.oidcApi_;
	}

	public api(): OidcApi | null {
		const authType = Setting.value('sync.6.authType');
		if (authType === 'oidc') {
			return this.oidcApi();
		}
		return null;
	}

	public static async newFileApi_(syncTargetId: number, options: WebDavOptions): Promise<FileApi> {
		const authType = options.authType ? options.authType() : 'basic';
		let oidcApi: OidcApi | null = null;

		if (authType === 'oidc') {
			oidcApi = new OidcApi({
				issuerUrl: options.oidcIssuerUrl ? options.oidcIssuerUrl() : '',
				clientId: options.oidcClientId ? options.oidcClientId() : '',
				clientSecret: options.oidcClientSecret ? options.oidcClientSecret() : '',
			});

			// Load existing auth if available
			const authJson = options.oidcAuth ? options.oidcAuth() : '';
			if (authJson) {
				try {
					const auth = JSON.parse(authJson) as OidcAuth;
					oidcApi.setAuth(auth);
				} catch (e) {
					// Invalid auth JSON, ignore
				}
			}
		}

		const apiOptions = {
			baseUrl: () => options.path(),
			username: () => options.username(),
			password: () => options.password(),
			ignoreTlsErrors: () => options.ignoreTlsErrors(),
			authType: () => authType === 'oidc' ? WebDavAuthType.Bearer : WebDavAuthType.Basic,
			bearerToken: async () => {
				if (oidcApi) {
					return oidcApi.ensureValidToken();
				}
				return null;
			},
		};

		const api = new WebDavApi(apiOptions);
		const driver = new FileApiDriverWebDav(api);
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(syncTargetId);
		return fileApi;
	}

	public static async checkConfig(options: WebDavOptions): Promise<CheckConfigResult> {
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
			output.errorMessage = (error as Error).message;
			if ((error as { code?: string }).code) output.errorMessage += ` (Code ${(error as { code: string }).code})`;
		}

		return output;
	}

	protected async initFileApi(): Promise<FileApi> {
		const authType = Setting.value('sync.6.authType');
		const oidcApi = authType === 'oidc' ? this.oidcApi() : null;

		const apiOptions = {
			baseUrl: () => Setting.value('sync.6.path'),
			username: () => Setting.value('sync.6.username'),
			password: () => Setting.value('sync.6.password'),
			ignoreTlsErrors: () => Setting.value('net.ignoreTlsErrors'),
			authType: () => authType === 'oidc' ? WebDavAuthType.Bearer : WebDavAuthType.Basic,
			bearerToken: async () => {
				if (oidcApi) {
					return oidcApi.ensureValidToken();
				}
				return null;
			},
		};

		const api = new WebDavApi(apiOptions);
		const driver = new FileApiDriverWebDav(api);
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(SyncTargetWebDAV.id());
		fileApi.setLogger(this.logger());

		return fileApi;
	}

	protected async initSynchronizer(): Promise<Synchronizer> {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
