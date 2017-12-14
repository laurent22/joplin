class DecryptionWorker {

	constructor() {
		this.state_ = 'idle';
	}

	start() {
		if (this.state_ !== 'idle') return;

		this.state_ = 'started';
	}

}

module.exports = DecryptionWorker;