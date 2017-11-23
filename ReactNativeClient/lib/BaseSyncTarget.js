const { reg } = require('lib/registry.js');

class BaseSyncTarget {

	constructor(db) {
		this.db_ = db;
		this.synchronizer_ = null;
		this.initState_ = null;
		this.logger_ = null;
	}

	logger() {
		return this.logger_;
	}

	setLogger(v) {
		this.logger_ = v;
	}

	db() {
		return this.db_;
	}

	isAuthenticated() {
		return false;
	}

	name() {
		throw new Error('Not implemented');
	}

	label() {
		throw new Error('Not implemented');
	}

	async initSynchronizer() {
		throw new Error('Not implemented');
	}

	async synchronizer() {
		if (this.synchronizer_) return this.synchronizer_;

		if (this.initState_ == 'started') {
			// Synchronizer is already being initialized, so wait here till it's done.
			return new Promise((resolve, reject) => {
				const iid = setInterval(() => {
					if (this.initState_ == 'ready') {
						clearInterval(iid);
						resolve(this.synchronizer_);
					}
					if (this.initState_ == 'error') {
						clearInterval(iid);
						reject(new Error('Could not initialise synchroniser'));
					}
				}, 1000);
			});
		} else {
			this.initState_ = 'started';

			try {
				this.synchronizer_ = await this.initSynchronizer();
				this.synchronizer_.setLogger(this.logger());
				this.synchronizer_.dispatch = BaseSyncTarget.dispatch;
				this.initState_ = 'ready';
				return this.synchronizer_;
			} catch (error) {
				this.initState_ = 'error';
				throw error;
			}
		}
	}

	async syncStarted() {
		if (!this.synchronizer_) return false;
		if (!this.isAuthenticated()) return false;
		const sync = await this.synchronizer();
		return sync.state() != 'idle';
	}

}

module.exports = BaseSyncTarget;