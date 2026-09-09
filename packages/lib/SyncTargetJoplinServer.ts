import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale';
import { FileApi } from './file-api';
import SyncTargetJoplinServerBase, { initFileApi } from './SyncTargetJoplinServerBase';

export interface FileApiOptions {
	path(): string;
	userContentPath(): string;
	username(): string;
	password(): string;
	apiKey(): string;
}

export default class SyncTargetJoplinServer extends SyncTargetJoplinServerBase {

	public static id() {
		return 9;
	}

	public static targetName() {
		return 'joplinServer';
	}

	public static description() {
		return 'Besides synchronisation and improved performances, Joplin Server also gives access to Joplin-specific sharing features.';
	}

	public static label() {
		return _('Joplin Server');
	}

	public static requiresPassword() {
		return Setting.value('sync.9.preferPasswordAuth');
	}

	public static override supportsShare(): boolean {
		return true;
	}

	public async fileApi(): Promise<FileApi> {
		return super.fileApi();
	}

	protected async initFileApi() {
		return initFileApi(SyncTargetJoplinServer.id(), this.logger(), {
			path: () => Setting.value('sync.9.path'),
			userContentPath: () => Setting.value('sync.9.userContentPath'),
			username: () => Setting.value('sync.9.username'),
			password: () => Setting.value('sync.9.password'),
			apiKey: () => Setting.value('sync.9.apiKey'),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
