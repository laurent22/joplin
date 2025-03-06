// PlatformImplementation provides access to platform specific dependencies,
// such as the clipboard, message dialog, etc. It allows having the same plugin

import { VersionInfo } from './api/types';
import { Implementation as ImagingImplementation } from './api/JoplinImaging';

export interface JoplinViewsDialogs {
	showMessageBox(message: string): Promise<number>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	showOpenDialog(options: any): Promise<any>;
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public get clipboard(): any {
		throw new Error('Not implemented: clipboard');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public get nativeImage(): any {
		throw new Error('Not implemented: nativeImage');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public registerComponent(_name: string, _component: any) {
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
