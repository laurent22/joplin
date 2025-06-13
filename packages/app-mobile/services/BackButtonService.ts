import { BackHandler, Platform } from 'react-native';

export type BackButtonHandler = ()=> boolean|Promise<boolean>;

export default class BackButtonService {
	private static handlers_: BackButtonHandler[] = [];
	private static defaultHandler_: BackButtonHandler;

	public static initialize(defaultHandler: BackButtonHandler) {
		this.defaultHandler_ = defaultHandler;

		// On web, `BackHandler.addEventListener` fails with warning "BackHandler is not supported on web and should not be used."
		if (Platform.OS !== 'web') {
			BackHandler.addEventListener('hardwareBackPress', () => {
				void this.back();
				return true;
			});
		}
	}

	public static async back() {
		if (this.handlers_.length) {
			const r = await this.handlers_[this.handlers_.length - 1]();
			if (r) return r;
		}

		return await this.defaultHandler_();
	}

	public static addHandler(handler: BackButtonHandler) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) return false;
		}

		this.handlers_.push(handler);
		return true;
	}

	public static removeHandler(handler: BackButtonHandler) {
		this.handlers_ = this.handlers_.filter(h => h !== handler);
	}
}


