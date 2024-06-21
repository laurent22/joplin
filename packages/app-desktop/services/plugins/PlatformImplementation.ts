import bridge from '../bridge';
import { Implementation as WindowImplementation } from '@joplin/lib/services/plugins/api/JoplinWindow';
import { injectCustomStyles } from '@joplin/lib/CssUtils';
import { VersionInfo } from '@joplin/lib/services/plugins/api/types';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import BasePlatformImplementation, { Joplin } from '@joplin/lib/services/plugins/BasePlatformImplementation';
import { CreateFromPdfOptions, Implementation as ImagingImplementation } from '@joplin/lib/services/plugins/api/JoplinImaging';
import shim from '@joplin/lib/shim';
import { join } from 'path';
import uuid, { uuidgen } from '@joplin/lib/uuid';
import { hasProtocol } from '@joplin/utils/url';
import { fileExtension } from '@joplin/utils/path';
const { clipboard, nativeImage } = require('electron');
const packageInfo = require('../../packageInfo');

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
			version: packageInfo.version,
			syncVersion: Setting.value('syncVersion'),
			profileVersion: reg.db().version(),
			platform: 'desktop',
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
		};
	}

	public constructor() {
		super();

		this.components_ = {};

		this.joplin_ = {
			views: {
				dialogs: {
					showMessageBox: async (message: string) => {
						return bridge().showMessageBox(message);
					},
					showOpenDialog: async (options) => {
						return bridge().showOpenDialog(options);
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
		const createFromPdf = async (path: string, options: CreateFromPdfOptions) => {
			const tempDir = join(Setting.value('tempDir'), uuid.createNano());
			await shim.fsDriver().mkdir(tempDir);
			try {
				const paths = await shim.pdfToImages(path, tempDir, options);
				return paths.map(path => nativeImage.createFromPath(path));
			} finally {
				await shim.fsDriver().remove(tempDir);
			}
		};

		return {
			createFromPath: async (path: string) => {
				let pathToProcess = path;
				let ext = fileExtension(path).toLowerCase();

				if (hasProtocol(path, ['http', 'https', 'file'])) {
					ext = fileExtension((new URL(path)).pathname);
					const tempFilePath = `${Setting.value('tempDir')}/${uuidgen()}${ext ? `.${ext}` : ''}`;
					await shim.fetchBlob(path, { path: tempFilePath });
					pathToProcess = tempFilePath;
				}

				if (ext === 'pdf') {
					const images = await createFromPdf(pathToProcess, { minPage: 1, maxPage: 1 });

					if (images.length === 0) {
						// Match the behavior or Electron's nativeImage when reading an invalid image.
						return nativeImage.createEmpty();
					}

					return images[0];
				} else {
					return nativeImage.createFromPath(pathToProcess);
				}
			},
			createFromPdf,
			getPdfInfo(path: string) {
				return shim.pdfInfo(path);
			},
		};
	}

}
