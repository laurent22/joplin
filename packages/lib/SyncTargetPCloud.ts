import PCloudApi from './pcloud-api';
import { _ } from './locale';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import BaseSyncTarget from './BaseSyncTarget';

import { parameters } from './parameters';
import { FileApi } from './file-api';
import FileApiDriverPCloud from './file-api-driver-pcloud';

export default class SyncTargetPCloud extends BaseSyncTarget {

	private api_: PCloudApi;

	public static id() {
		return 12;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See BaseSyncTarget.db_: subclasses pass JoplinDatabase or test mocks
	public constructor(db: any, options: Record<string, unknown> = null) {
		super(db, options);
		this.api_ = null;
	}

	public static unsupportedPlatforms() {
		// Web: The login UI doesn't work.
		return ['web'];
	}

	public static targetName() {
		return 'pcloud';
	}

	public static label() {
		return _('pCloud');
	}

	public static description() {
		return 'A secure cloud storage service with data centres in the United States and the European Union.';
	}

	public static supportsSelfHosted(): boolean {
		return false;
	}

	public async isAuthenticated() {
		const auth = this.api().auth();
		return !!auth && !!auth.accessToken;
	}

	public syncTargetId() {
		return SyncTargetPCloud.id();
	}

	public pCloudParameters() {
		const p = parameters();
		// The credentials may not be set (for example in the test
		// environment), in which case the login flow will simply fail.
		if (!p.pCloud) return { id: '', secret: '' };
		return p.pCloud;
	}

	public authRouteName() {
		return 'PCloudLogin';
	}

	public api() {
		if (this.api_) return this.api_;

		// When testing, the file API (along with its own API instance) is
		// created by the test utils and set via setFileApi - return it from
		// there.
		if (this.fileApi_) return this.fileApi_.driver().api();

		this.api_ = new PCloudApi(this.pCloudParameters().id, this.pCloudParameters().secret);

		this.api_.on('authRefreshed', (a: unknown) => {
			this.logger().info('Saving updated pCloud auth.');
			Setting.setValue(`sync.${this.syncTargetId()}.auth`, a ? JSON.stringify(a) : '');
		});

		let auth = Setting.value(`sync.${this.syncTargetId()}.auth`);
		if (auth) {
			try {
				auth = JSON.parse(auth);
			} catch (error) {
				this.logger().warn('Could not parse pCloud auth token');
				this.logger().warn(error);
				auth = null;
			}

			this.api_.setAuth(auth);
		}

		return this.api_;
	}

	public async initFileApi() {
		const api = this.api();

		// pCloud apps have access to the whole drive (there is no
		// application-specific folder like on OneDrive or Dropbox), so Joplin
		// files are stored in a fixed top-level "Joplin" directory.
		const baseDir = 'Joplin';
		await api.createFolderIfNotExists(`/${baseDir}`);

		const fileApi = new FileApi(baseDir, new FileApiDriverPCloud(api));
		fileApi.setSyncTargetId(this.syncTargetId());
		fileApi.setLogger(this.logger());
		return fileApi;
	}

	public async initSynchronizer() {
		try {
			if (!(await this.isAuthenticated())) throw new Error('User is not authenticated');
			return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
		} catch (error) {
			BaseSyncTarget.dispatch({ type: 'SYNC_REPORT_UPDATE', report: { errors: [error] } });
			throw error;
		}
	}
}
