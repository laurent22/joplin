
import BaseSyncTarget from './BaseSyncTarget';
import { _ } from './locale';
import DropboxApi from './DropboxApi';
import Setting from './models/Setting';
import { parameters } from './parameters.js';
import { FileApi } from './file-api.js';
import Synchronizer from './Synchronizer';
import { FileApiDriverDropbox } from './file-api-driver-dropbox.js';
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

	static description() {
		return 'A file hosting service that offers cloud storage and file synchronization';
	}

	static supportsSelfHosted() {
		return false;
	}

	authRouteName() {
		return 'DropboxLogin';
	}

	async isAuthenticated() {
		const f = await this.fileApi();
		return !!f
			.driver()
			.api()
			.authToken();
	}

	async api() {
		const fileApi = await this.fileApi();
		return fileApi.driver().api();
	}

	async initFileApi() {
		const params = parameters().dropbox;

		const api = new DropboxApi({
			id: params.id,
			secret: params.secret,
		});

		api.on('authRefreshed', auth => {
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

	async initSynchronizer() {
		if (!(await this.isAuthenticated())) throw new Error('User is not authentified');
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetDropbox;
