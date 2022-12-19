export default class NavService {

	public static dispatch: Function = () => {};
	private static handlers_: Function[] = [];

	public static async go(routeName: string) {
		if (this.handlers_.length) {
			const r = await this.handlers_[this.handlers_.length - 1]();
			if (r) return r;
		}

		this.dispatch({
			type: 'NAV_GO',
			routeName: routeName,
		});
	}

	public static addHandler(handler: Function) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) return;
		}

		this.handlers_.push(handler);
	}

	public static removeHandler(hanlder: Function) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === hanlder) this.handlers_.splice(i, 1);
		}
	}
}
