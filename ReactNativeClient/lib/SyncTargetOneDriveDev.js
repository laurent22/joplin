const BaseSyncTarget = require('lib/BaseSyncTarget.js');
const SyncTargetOneDrive = require('lib/SyncTargetOneDrive.js');
const { _ } = require('lib/locale.js');
const { OneDriveApi } = require('lib/onedrive-api.js');
const Setting = require('lib/models/Setting.js');
const { parameters } = require('lib/parameters.js');
const { FileApi } = require('lib/file-api.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { FileApiDriverOneDrive } = require('lib/file-api-driver-onedrive.js');

class SyncTargetOneDriveDev extends SyncTargetOneDrive {
	static id() {
		return 4;
	}

	static targetName() {
		return 'onedrive_dev';
	}

	static label() {
		return _('OneDrive Dev (For testing only)');
	}

	syncTargetId() {
		return SyncTargetOneDriveDev.id();
	}

	oneDriveParameters() {
		return parameters('dev').oneDrive;
	}
}

const staticSelf = SyncTargetOneDriveDev;

module.exports = SyncTargetOneDriveDev;
