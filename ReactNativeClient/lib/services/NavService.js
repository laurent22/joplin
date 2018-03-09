class NavService {

	static async go(routeName) {
		if (this.handlers_.length) {
			let r = await this.handlers_[this.handlers_.length - 1]();
			if (r) return r;
		}

		this.dispatch({
			type: 'NAV_GO',
			routeName: routeName,
		});	
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

NavService.handlers_ = [];

module.exports = NavService;