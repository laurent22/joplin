import bridge from '../bridge';
const { clipboard, nativeImage } = require('electron');

interface JoplinViewsDialogs {
	showMessageBox(message: string): Promise<number>;
}

interface JoplinViews {
	dialogs: JoplinViewsDialogs;
}

interface Joplin {
	views: JoplinViews;
}

interface Components {
	[key: string]: any;
}

// PlatformImplementation provides access to platform specific dependencies,
// such as the clipboard, message dialog, etc. It allows having the same plugin
// API for all platforms, but with different implementations.
export default class PlatformImplementation {

	private static instance_: PlatformImplementation;
	private joplin_: Joplin;
	private components_: Components;

	public static instance(): PlatformImplementation {
		if (!this.instance_) this.instance_ = new PlatformImplementation();
		return this.instance_;
	}

	public get clipboard() {
		return clipboard;
	}

	public get nativeImage() {
		return nativeImage;
	}

	constructor() {
		this.components_ = {};

		this.joplin_ = {
			views: {
				dialogs: {
					showMessageBox: async function(message: string) {
						return bridge().showMessageBox(message);
					},
				},
			},
		};
	}

	registerComponent(name: string, component: any) {
		this.components_[name] = component;
	}

	unregisterComponent(name: string) {
		delete this.components_[name];
	}

	public get joplin(): Joplin {
		return this.joplin_;
	}

}
