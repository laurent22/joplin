import { VersionInfo } from '@joplin/lib/services/plugins/api/types';
import { Implementation as WindowImplementation } from '@joplin/lib/services/plugins/api/JoplinWindow';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import BasePlatformImplementation, { Joplin } from '@joplin/lib/services/plugins/BasePlatformImplementation';
import { Implementation as ImagingImplementation } from '@joplin/lib/services/plugins/api/JoplinImaging';
import RNVersionInfo from 'react-native-version-info';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';


interface Components {
	[key: string]: any;
}

// PlatformImplementation provides access to platform specific dependencies,
// such as the clipboard, message dialog, etc. It allows having the same plugin
// API for all platforms, but with different implementations.
export default class PlatformImplementation extends BasePlatformImplementation {

	private static instance_: PlatformImplementation;
	private joplin_: Joplin;
	private components_: Components;

	public static instance(): PlatformImplementation {
		if (!this.instance_) this.instance_ = new PlatformImplementation();
		return this.instance_;
	}

	public get versionInfo(): VersionInfo {
		return {
			version: RNVersionInfo.appVersion,
			syncVersion: Setting.value('syncVersion'),
			profileVersion: reg.db().version(),
			platform: 'mobile',
		};
	}

	public constructor() {
		super();

		this.components_ = {};

		this.joplin_ = {
			views: {
				dialogs: {
					showMessageBox: async (message: string) => {
						return await shim.showMessageBox(
							message,
							{ title: _('Plugin message') },
						);
					},
					showOpenDialog: async (_options) => {
						throw new Error('Not implemented: showOpenDialog');
					},
				},
			},
		};
	}

	public registerComponent(name: string, component: any) {
		this.components_[name] = component;
	}

	public unregisterComponent(name: string) {
		delete this.components_[name];
	}

	public get joplin(): Joplin {
		return this.joplin_;
	}

	public get imaging(): ImagingImplementation {
		return {
			nativeImage: null,
		};
	}

	public get nativeImage(): any {
		return null;
	}

	public get clipboard(): any {
		return null;
	}

	public get window(): WindowImplementation {
		return {
			injectCustomStyles: null,
		};
	}
}
