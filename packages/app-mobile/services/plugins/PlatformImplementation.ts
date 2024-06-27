import { VersionInfo } from '@joplin/lib/services/plugins/api/types';
import { Implementation as WindowImplementation } from '@joplin/lib/services/plugins/api/JoplinWindow';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import BasePlatformImplementation, { Joplin } from '@joplin/lib/services/plugins/BasePlatformImplementation';
import { CreateFromPdfOptions, Implementation as ImagingImplementation } from '@joplin/lib/services/plugins/api/JoplinImaging';
import RNVersionInfo from 'react-native-version-info';
import { _ } from '@joplin/lib/locale';
import shim from '@joplin/lib/shim';
import Clipboard from '@react-native-clipboard/clipboard';



interface Components {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
			createFromPath: async (_path: string) => {
				throw new Error('Not implemented: createFromPath');
			},
			createFromPdf: (_path: string, _options: CreateFromPdfOptions) => {
				throw new Error('Not implemented: createFromPdf');
			},
			getPdfInfo: async () => {
				throw new Error('Not implemented: getPdfInfo');
			},
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public get nativeImage(): any {
		return null;
	}

	public get clipboard() {
		// Deny access to the clipboard on iOS, as per AppStore guidelines
		// (as of March 2024).
		if (shim.mobilePlatform() === 'ios') {
			return {
				readText: () => {
					throw new Error('Not available on iOS');
				},
				writeText: () => {
					throw new Error('Not available on iOS');
				},
				availableFormats: (): string[] => [],
			};
		}
		return {
			readText: () => Clipboard.getString(),
			writeText: (text: string) => Clipboard.setString(text),
			availableFormats: () => ['text/plain'],
		};
	}

	public get window(): WindowImplementation {
		return {
			injectCustomStyles: null,
		};
	}
}
