const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const { _ } = require('lib/locale.js');
const { OneDriveApi } = require('lib/onedrive-api.js');
const { Setting } = require('lib/models/setting.js');
const { parameters } = require('lib/parameters.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApiDriverOneDrive } = require('lib/file-api-driver-onedrive.js');

class SyncTarget3 extends BaseSyncTarget {

	constructor(db, options = null) {
		super(db, options);
		this.api_ = null;
	}

	id() {
		return 3;
	}

	name() {
		return 'onedrive';
	}

	label() {
		return _('OneDrive');
	}

	isAuthenticated() {
		return this.api().auth();
	}

	api() {
		if (this.api_) return this.api_;

		const isPublic = Setting.value('appType') != 'cli';

		this.api_ = new OneDriveApi(parameters().oneDrive.id, parameters().oneDrive.secret, isPublic);
		this.api_.setLogger(this.logger());

		this.api_.on('authRefreshed', (a) => {
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

			this.api_.setAuth(auth);
		}
		
		return this.api_;
	}

	initFileApi() {
		const fileApi = new FileApi(appDir, new FileApiDriverOneDrive(this.api()));
		fileApi.setSyncTargetId(this.id());
		fileApi.setLogger(this.logger());
		return fileApi;
	}

	async initSynchronizer() {
		if (!this.isAuthenticated()) throw new Error('User is not authentified');
		
		const appDir = await this.api().appDirectory();
		return new Synchronizer(this.db(), this.fileApi(), Setting.value('appType'));
	}

}

module.exports = SyncTarget3;