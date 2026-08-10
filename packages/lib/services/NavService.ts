export type OnNavigateCallback = ()=> Promise<boolean>;

export default class NavService {

	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Set by each app to its redux dispatch; defaults to a no-op and per-app action types diverge, so it is typed loosely here (see BaseModel.dispatch)
	public static dispatch: Function = () => {};
	private static handlers_: OnNavigateCallback[] = [];

	public static async go(routeName: string, additionalProps: Record<string, unknown>|null = null) {
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

	public static addHandler(handler: OnNavigateCallback) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) return;
		}

		this.handlers_.push(handler);
	}

	public static removeHandler(handler: OnNavigateCallback) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) this.handlers_.splice(i, 1);
		}
	}
}
