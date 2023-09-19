// PlatformImplementation provides access to platform specific dependencies,
// such as the clipboard, message dialog, etc. It allows having the same plugin

import { VersionInfo } from './api/types';
import { Implementation as WindowImplementation } from './api/JoplinWindow';
import { Implementation as ImagingImplementation } from './api/JoplinImaging';

export interface JoplinViewsDialogs {
	showMessageBox(message: string): Promise<number>;
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
		throw new Error('Not implemented');
	}

	public get clipboard(): any {
		throw new Error('Not implemented');
	}

	public get nativeImage(): any {
		throw new Error('Not implemented');
	}

	public get window(): WindowImplementation {
		throw new Error('Not implemented');
	}

	public registerComponent(_name: string, _component: any) {
		throw new Error('Not implemented');
	}

	public unregisterComponent(_name: string) {
		throw new Error('Not implemented');
	}

	public get joplin(): Joplin {
		throw new Error('Not implemented');
	}

	public get imaging(): ImagingImplementation {
		throw new Error('Not implemented');
	}

}
