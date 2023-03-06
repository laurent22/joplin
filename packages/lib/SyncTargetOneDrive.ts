import OneDriveApi from './onedrive-api';
import { _ } from './locale';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import BaseSyncTarget from './BaseSyncTarget';

const { parameters } = require('./parameters.js');
const { FileApi } = require('./file-api.js');
const { FileApiDriverOneDrive } = require('./file-api-driver-onedrive.js');

export default class SyncTargetOneDrive extends BaseSyncTarget {

	private api_: any;

	public static id() {
		return 3;
	}

	public constructor(db: any, options: any = null) {
		super(db, options);
		this.api_ = null;
	}

	public static targetName() {
		return 'onedrive';
	}

	public static label() {
		return _('OneDrive');
	}

	public static description() {
		return 'A file hosting service operated by Microsoft as part of its web version of Office.';
	}

	public static supportsSelfHosted(): boolean {
		return false;
	}

	public async isAuthenticated() {
		return !!this.api().auth();
	}

	public syncTargetId() {
		return SyncTargetOneDrive.id();
	}

	public isTesting() {
		const p = parameters();
		return !!p.oneDriveTest;
	}

	public oneDriveParameters() {
		const p = parameters();
		if (p.oneDriveTest) return p.oneDriveTest;
		return p.oneDrive;
	}

	public authRouteName() {
		return 'OneDriveLogin';
	}

	public api() {
		if (this.isTesting()) {
			return this.fileApi_.driver().api();
		}

		if (this.api_) return this.api_;

		const isPublic = Setting.value('appType') !== 'cli' && Setting.value('appType') !== 'desktop';

		this.api_ = new OneDriveApi(this.oneDriveParameters().id, this.oneDriveParameters().secret, isPublic);

		this.api_.on('authRefreshed', (a: any) => {
			this.logger().info('Saving updated OneDrive auth.');
			Setting.setValue(`sync.${this.syncTargetId()}.auth`, a ? JSON.stringify(a) : null);
		});

		let auth = Setting.value(`sync.${this.syncTargetId()}.auth`);
		if (auth) {
			try {
				auth = JSON.parse(auth);
			} catch (error) {
				this.logger().warn('Could not parse OneDrive auth token');
				this.logger().warn(error);
				auth = null;
			}

			this.api_.setAuth(auth);
		}

		return this.api_;
	}

	public async initFileApi() {
		let context = Setting.value(`sync.${this.syncTargetId()}.context`);
		context = context === '' ? null : JSON.parse(context);
		let accountProperties = context ? context.accountProperties : null;
		if (!accountProperties) {
			accountProperties = await this.api_.execAccountPropertiesRequest();
			context ? context.accountProperties = accountProperties : context = { accountProperties: accountProperties };
			Setting.setValue(`sync.${this.syncTargetId()}.context`, JSON.stringify(context));
		}
		this.api_.setAccountProperties(accountProperties);
		const appDir = await this.api().appDirectory();
		const fileApi = new FileApi(appDir, new FileApiDriverOneDrive(this.api()));
		fileApi.setSyncTargetId(this.syncTargetId());
		fileApi.setLogger(this.logger());
		return fileApi;
	}

	public async initSynchronizer() {
		try {
			if (!(await this.isAuthenticated())) throw new Error('User is not authentified');
			return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
		} catch (error) {
			BaseSyncTarget.dispatch({ type: 'SYNC_REPORT_UPDATE', report: { errors: [error] } });
			throw error;
		}


	}
}
