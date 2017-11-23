const BaseSyncTarget = require('lib/BaseSyncTarget.js');

class SyncTarget1 extends BaseSyncTarget {

	id() {
		return 1;
	}

	name() {
		return 'Memory';
	}

	label() {
		return 'Memory';
	}

	isAuthenticated() {
		return true;
	}

}

module.exports = SyncTarget1;