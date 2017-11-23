const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const { OneDriveApi } = require('lib/onedrive-api.js');
const { Setting } = require('lib/models/setting.js');
const { parameters } = require('lib/parameters.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApiDriverOneDrive } = require('lib/file-api-driver-onedrive.js');

class SyncTarget3 extends BaseSyncTarget {

	constructor(db) {
		super();
		this.oneDriveApi_ = null;
	}

	id() {
		return 3;
	}

	name() {
		return 'OneDrive';
	}

	label() {
		return _('OneDrive');
	}

	isAuthenticated() {
		return this.oneDriveApi_ && this.oneDriveApi_.auth();
	}

	oneDriveApi() {
		if (this.oneDriveApi_) return this.oneDriveApi_;

		const isPublic = Setting.value('appType') != 'cli';

		this.oneDriveApi_ = new OneDriveApi(parameters().oneDrive.id, parameters().oneDrive.secret, isPublic);
		this.oneDriveApi_.setLogger(this.logger());

		this.oneDriveApi_.on('authRefreshed', (a) => {
			this.logger().info('Saving updated OneDrive auth.');
			Setting.setValue('sync.' + this.id() + '.auth', a ? JSON.stringify(a) : null);
		});

		let auth = Setting.value('sync.' + this.id() + '.auth');
		if (auth) {
			try {
				auth = JSON.parse(auth);
			} catch (error) {
				this.logger().warn('Could not parse OneDrive auth token');
				this.logger().warn(error);
				auth = null;
			}

			this.oneDriveApi_.setAuth(auth);
		}
		
		return this.oneDriveApi_;
	}

	async initSynchronizer() {
		let fileApi = null;

		if (!this.oneDriveApi().auth()) throw new Error('User is not authentified');
		const appDir = await this.oneDriveApi().appDirectory();
		fileApi = new FileApi(appDir, new FileApiDriverOneDrive(this.oneDriveApi()));
		fileApi.setSyncTargetId(this.id());
		fileApi.setLogger(this.logger());

		return new Synchronizer(this.db(), fileApi, Setting.value('appType'));
	}

	isAuthenticated() {
		return true;
	}

}

module.exports = SyncTarget3;