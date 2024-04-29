export type OnNavigateCallback = ()=> Promise<boolean>;

export default class NavService {

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static dispatch: Function = () => {};
	private static handlers_: OnNavigateCallback[] = [];

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public static async go(routeName: string, additionalProps: Record<string, any>|null = null) {
		if (this.handlers_.length) {
			const r = await this.handlers_[this.handlers_.length - 1]();
			if (r) return r;
		}

		this.dispatch({
			type: 'NAV_GO',
			routeName: routeName,
			...additionalProps,
		});
		return false;
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static addHandler(handler: OnNavigateCallback) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) return;
		}

		this.handlers_.push(handler);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static removeHandler(handler: OnNavigateCallback) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) this.handlers_.splice(i, 1);
		}
	}
}
