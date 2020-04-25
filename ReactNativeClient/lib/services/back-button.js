const { BackHandler } = require('react-native');

class BackButtonService {
	static initialize(defaultHandler) {
		this.defaultHandler_ = defaultHandler;

		BackHandler.addEventListener('hardwareBackPress', async () => {
			return this.back();
		});
	}

	static async back() {
		if (this.handlers_.length) {
			const r = await this.handlers_[this.handlers_.length - 1]();
			if (r) return r;
		}

		return await this.defaultHandler_();
	}

	static addHandler(handler) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) return;
		}

		return this.handlers_.push(handler);
	}

	static removeHandler(hanlder) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === hanlder) this.handlers_.splice(i, 1);
		}
	}
}

BackButtonService.defaultHandler_ = null;
BackButtonService.handlers_ = [];

module.exports = { BackButtonService };
