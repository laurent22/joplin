export default class NavService {

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static dispatch: Function = () => {};
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
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

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static addHandler(handler: Function) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) return;
		}

		this.handlers_.push(handler);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static removeHandler(hanlder: Function) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === hanlder) this.handlers_.splice(i, 1);
		}
	}
}
