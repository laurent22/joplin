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
		return Setting.value('sync.11.id') !== '';
	}

	public static override requiresPassword() {
		return false;
	}

	protected override async initFileApi() {
		return initFileApi(SyncTargetJoplinServerSAML.id(), this.logger(), {
			path: () => Setting.value('sync.11.path'),
			userContentPath: () => Setting.value('sync.11.userContentPath'),
			username: () => '',
			password: () => '',
		});
	}
}
