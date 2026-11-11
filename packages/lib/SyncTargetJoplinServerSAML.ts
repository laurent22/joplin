import FileApiDriverJoplinServer from './file-api-driver-joplinServer';
import Setting from './models/Setting';
import { _ } from './locale.js';
import JoplinServerApi, { Session } from './JoplinServerApi';
import { FileApi } from './file-api';
import SyncTargetJoplinServer, { FileApiOptions } from './SyncTargetJoplinServer';
import Logger from '@joplin/utils/Logger';

export async function newFileApi(id: number, options: FileApiOptions) {
	const apiOptions = {
		baseUrl: () => options.path(),
		userContentBaseUrl: () => options.userContentPath(),
		username: () => '',
		password: () => '',
		apiKey: () => Setting.value('sync.11.apiKey'),
		session: () => ({ id: Setting.value('sync.11.id'), user_id: Setting.value('sync.11.userId') }),
		env: Setting.value('env'),
	};

	const api = new JoplinServerApi(apiOptions);
	const driver = new FileApiDriverJoplinServer(api);
	const fileApi = new FileApi('', driver);
	fileApi.setSyncTargetId(id);
	await fileApi.initialize();
	return fileApi;
}

export async function initFileApi(syncTargetId: number, logger: Logger, options: FileApiOptions) {
	const fileApi = await newFileApi(syncTargetId, options);
	fileApi.setLogger(logger);
	return fileApi;
}

export const authenticateWithCode = async (code: string) => {
	try {
		const response = await fetch(`${Setting.value('sync.11.path')}/api/login_with_code/${code}`);
		if (response.status !== 200) {
			return false;
		}

		const token: Session = await response.json();
		Setting.setValue('sync.11.id', token.id);
		Setting.setValue('sync.11.userId', token.user_id);

	} catch (_e) {
		return false;
	}

	return true;
};

// A sync target for Joplin Server that uses SAML for authentication.
//
// Based on the regular Joplin Server sync target.
export default class SyncTargetJoplinServerSAML extends SyncTargetJoplinServer {

	private lastFileApiOptions_: FileApiOptions|null = null;

	public static override id() {
		return 11;
	}

	public static override targetName() {
		return 'joplinServerSaml';
	}

	public static override label() {
		return `${_('Joplin Server (SAML)')}`;
	}

	public override async isAuthenticated() {
		if (!Setting.value('sync.11.id')) return false;

		// We check that the file API has been initialized at least once, otherwise the below check
		// will always fail and it will be impossible to login.
		if (this.lastFileApiOptions_) {
			const check = await SyncTargetJoplinServer.checkConfig(null, null, await this.fileApi());
			return check.ok;
		}

		return true;
	}

	public static override requiresPassword() {
		return false;
	}

	public static override async checkConfig(fileApi: FileApiOptions) {
		try {
			// Simulate a login request
			const result = await fetch(`${fileApi.path()}/api/saml`);

			if (result.status === 200) { // The server successfully responded, SAML is enabled
				return {
					ok: true,
					errorMessage: '',
				};
			} else { // SAML is disabled or an error occurred
				const text = await result.text();
				let message = text; // Use the textual body as the default message

				// Check if we got an error message
				if (result.headers.get('Content-Type').includes('application/json')) {
					try {
						const json = JSON.parse(text);

						if (json.error) {
							message = json.error;
						}
					} catch (_e) {} // eslint-disable-line no-empty -- Keep the plain text response as the error message, ignore the parsing exception
				}

				return {
					ok: false,
					errorMessage: `Could not connect to server: Error ${result.status}: ${message}`,
				};
			}
		} catch (e) {
			return {
				ok: false,
				errorMessage: e.message,
			};
		}
	}

	protected override async initFileApi() {
		this.lastFileApiOptions_ = {
			path: () => Setting.value('sync.11.path'),
			userContentPath: () => Setting.value('sync.11.userContentPath'),
			username: () => '',
			password: () => '',
			apiKey: () => Setting.value('sync.11.apiKey'),
		};
		return initFileApi(SyncTargetJoplinServerSAML.id(), this.logger(), this.lastFileApiOptions_);
	}
}
