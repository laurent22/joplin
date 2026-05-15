/* eslint-disable @typescript-eslint/no-explicit-any */
import BaseSyncTarget from './BaseSyncTarget';
import { _ } from './locale';
import DropboxApi from './DropboxApi';
import Setting from './models/Setting';
import { parameters } from './parameters';
import { FileApi } from './file-api';
import Synchronizer from './Synchronizer';
import FileApiDriverDropbox from './file-api-driver-dropbox';

class SyncTargetDropbox extends BaseSyncTarget {
	public static id() {
		return 7;
	}

	public constructor(db: any, options: any = null) {
		super(db, options);
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

	public async api(): Promise<DropboxApi> {
		const fileApi = await this.fileApi();
		return (fileApi.driver() as any).api();
	}

	protected async initFileApi() {
		const params = parameters().dropbox;

		const api = new DropboxApi({
			id: params.id,
			secret: params.secret,
		});

		api.on('authRefreshed', (auth: string | null) => {
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
		if (!(await this.isAuthenticated())) throw new Error('User is not authentified');
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

export default SyncTargetDropbox;
