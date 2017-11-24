const syncTargetClasses_ = {
	1: require('lib/SyncTarget1.js'),
	2: require('lib/SyncTarget2.js'),
	3: require('lib/SyncTarget3.js'),
};

class SyncTargetRegistry {

	static classById(syncTargetId) {
		if (!syncTargetClasses_[syncTargetId]) throw new Error('Invalid id: ' + syncTargetId);
		return syncTargetClasses_[syncTargetId];
	}

}

module.exports = SyncTargetRegistry;