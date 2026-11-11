// PlatformImplementation provides access to platform specific dependencies,
// such as the clipboard, message dialog, etc. It allows having the same plugin

import { VersionInfo } from './api/types';
import { Implementation as ImagingImplementation } from './api/JoplinImaging';

export interface ShowOpenDialogOptions {
	filters?: { name: string; extensions: string[] }[];
	properties?: string[];
}

export interface JoplinViewsDialogs {
	showMessageBox(message: string): Promise<number>;
	showOpenDialog(options: ShowOpenDialogOptions): Promise<string[] | null>;
}

export interface JoplinViews {
	dialogs: JoplinViewsDialogs;
}

export interface Joplin {
	views: JoplinViews;
}

// API for all platforms, but with different implementations.
export default class BasePlatformImplementation {

	public get versionInfo(): VersionInfo {
		throw new Error('Not implemented: versionInfo');
	}

	public get clipboard(): unknown {
		throw new Error('Not implemented: clipboard');
	}

	public get nativeImage(): unknown {
		throw new Error('Not implemented: nativeImage');
	}

	public registerComponent(_name: string, _component: unknown) {
		throw new Error('Not implemented: registerComponent');
	}

	public unregisterComponent(_name: string) {
		throw new Error('Not implemented: unregisterComponent');
	}

	public get joplin(): Joplin {
		throw new Error('Not implemented: joplin');
	}

	public get imaging(): ImagingImplementation {
		throw new Error('Not implemented: imaging');
	}

}
