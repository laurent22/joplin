import BasePlatformImplementation from '../BasePlatformImplementation';
import shim from '../../../shim';
import Setting from '../../../models/Setting';
import { reg } from '../../../registry';
import { Implementation as ImagingImplementation } from '../api/JoplinImaging';

export default class MockPlatformImplementation extends BasePlatformImplementation {
	public override get versionInfo() {
		return {
			version: shim.appVersion(),
			syncVersion: Setting.value('syncVersion'),
			platform: 'desktop' as 'desktop',
			profileVersion: reg.db().version(),
		};
	}

	public override get nativeImage(): null {
		return null;
	}

	public override get imaging(): ImagingImplementation {
		return null;
	}

	public override get joplin() {
		return { views: { dialogs: { showMessageBox: jest.fn(), showOpenDialog: jest.fn() } } };
	}

	public override get clipboard(): null {
		return null;
	}
}

