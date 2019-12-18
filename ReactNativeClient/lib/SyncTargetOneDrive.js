const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const { OneDriveApi } = require('lib/onedrive-api.js');
const Setting = require('lib/models/Setting.js');
const { parameters } = require('lib/parameters.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApiDriverOneDrive } = require('lib/file-api-driver-onedrive.js');

class SyncTargetOneDrive extends BaseSyncTarget {
	static id() {
		return 3;
	}

	constructor(db, options = null) {
		super(db, options);
		this.api_ = null;
	}

	static targetName() {
		return 'onedrive';
	}

	static label() {
		return _('OneDrive');
	}

	async isAuthenticated() {
		return !!this.api().auth();
	}

	syncTargetId() {
		return SyncTargetOneDrive.id();
	}

	oneDriveParameters() {
		return parameters().oneDrive;
	}

	authRouteName() {
		return 'OneDriveLogin';
	}

	api() {
		if (this.api_) return this.api_;

		const isPublic = Setting.value('appType') != 'cli' && Setting.value('appType') != 'desktop';

		this.api_ = new OneDriveApi(this.oneDriveParameters().id, this.oneDriveParameters().secret, isPublic);
		this.api_.setLogger(this.logger());

		this.api_.on('authRefreshed', a => {
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

	async initFileApi() {
		const appDir = await this.api().appDirectory();
		const fileApi = new FileApi(appDir, new FileApiDriverOneDrive(this.api()));
		fileApi.setSyncTargetId(this.syncTargetId());
		fileApi.setLogger(this.logger());
		return fileApi;
	}

	async initSynchronizer() {
		if (!(await this.isAuthenticated())) throw new Error('User is not authentified');
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

module.exports = SyncTargetOneDrive;
