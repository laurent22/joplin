import bridge from '../bridge';
import { Implementation as WindowImplementation } from '@joplin/lib/services/plugins/api/JoplinWindow';
import { injectCustomStyles } from '@joplin/lib/CssUtils';
import { VersionInfo } from '@joplin/lib/services/plugins/api/types';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import BasePlatformImplementation, { Joplin } from '@joplin/lib/services/plugins/BasePlatformImplementation';
import { Dispatch } from 'redux';
import { readFile } from 'fs-extra';
const { clipboard, nativeImage } = require('electron');
const packageInfo = require('../../packageInfo');

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
	private dispatch_: Dispatch|null = null;

	public static instance(): PlatformImplementation {
		if (!this.instance_) this.instance_ = new PlatformImplementation();
		return this.instance_;
	}

	public initialize(dispatch: Dispatch) {
		this.dispatch_ = dispatch;
	}

	public get versionInfo(): VersionInfo {
		return {
			version: packageInfo.version,
			syncVersion: Setting.value('syncVersion'),
			profileVersion: reg.db().version(),
		};
	}

	public get clipboard() {
		return clipboard;
	}

	public get nativeImage() {
		return nativeImage;
	}

	public get window(): WindowImplementation {
		return {
			injectCustomStyles: injectCustomStyles,
			loadNoteCssFile: async (filePath) => {
				const cssString = await readFile(filePath, 'utf8');

				this.dispatch_({
					type: 'CUSTOM_CSS_APPEND',
					css: cssString,
				});
			},
		};
	}

	public constructor() {
		super();

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

	public registerComponent(name: string, component: any) {
		this.components_[name] = component;
	}

	public unregisterComponent(name: string) {
		delete this.components_[name];
	}

	public get joplin(): Joplin {
		return this.joplin_;
	}

}
