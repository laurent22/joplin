import BaseSyncTarget from './BaseSyncTarget';
import { _ } from './locale';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { parameters } from './parameters';
import { FileApi } from './file-api';
const DropboxApi = require('./DropboxApi');
const { FileApiDriverDropbox } = require('./file-api-driver-dropbox.js');

export default class SyncTargetDropbox extends BaseSyncTarget {

	public static id() {
		return 7;
	}

	public static targetName() {
		return 'dropbox';
	}

	public static label() {
		return _('Dropbox');
	}

	public static description() {
		return 'A file hosting service that offers cloud storage and file synchronization';
	}

	public static supportsSelfHosted() {
		return false;
	}

	public authRouteName() {
		return 'DropboxLogin';
	}

	public async isAuthenticated() {
		const f = await this.fileApi();
		return !!f
			.driver()
			.api()
			.authToken();
	}

	public async api() {
		const fileApi = await this.fileApi();
		return fileApi.driver().api();
	}

	public async initFileApi() {
		const params = parameters().dropbox;

		const api = new DropboxApi({
			id: params.id,
			secret: params.secret,
		});

		api.on('authRefreshed', (auth: string|null) => {
			this.logger().info('Saving updated Dropbox auth.');
			Setting.setValue(`sync.${SyncTargetDropbox.id()}.auth`, auth ? auth : null);
		});

		const authToken = Setting.value(`sync.${SyncTargetDropbox.id()}.auth`);
		api.setAuthToken(authToken);

		const appDir = '';
		const fileApi = new FileApi(appDir, new FileApiDriverDropbox(api));
		fileApi.setSyncTargetId(SyncTargetDropbox.id());
		fileApi.setLogger(this.logger());
		return fileApi;
	}

	public async initSynchronizer() {
		if (!(await this.isAuthenticated())) throw new Error('User is not authenticated');
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
