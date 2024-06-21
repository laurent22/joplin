import { AppType } from '../../../../models/Setting';
import isCompatible from '../isCompatible';

describe('isCompatible', () => {
	test.each([
		// Should support the case where no platform is provided
		{
			manifest: { app_min_version: '2.0' },
			appVersion: '2.1.0',
			shouldSupportDesktop: true,
			shouldSupportMobile: false,
		},
		{
			manifest: { app_min_version: '2.0' },
			appVersion: '1.9.0',
			shouldSupportDesktop: false,
			shouldSupportMobile: false,
		},
		{
			manifest: { app_min_version: '3.0.2' },
			appVersion: '3.0.2',
			shouldSupportDesktop: true,
			shouldSupportMobile: false,
		},

		// Should support the case where only one platform is provided, with no version
		{
			manifest: { app_min_version: '3.0.2', platforms: ['mobile'] },
			appVersion: '3.0.2',
			shouldSupportDesktop: false,
			shouldSupportMobile: true,
		},
		{
			manifest: { app_min_version: '2.0', platforms: ['desktop'] },
			appVersion: '2.1.0',
			shouldSupportDesktop: true,
			shouldSupportMobile: false,
		},
		{
			manifest: { app_min_version: '3.0.2', platforms: ['mobile'] },
			appVersion: '3.0.0',
			shouldSupportDesktop: false,
			shouldSupportMobile: false,
		},

		// Should support the case where two platforms are specified
		{
			manifest: { app_min_version: '3.0.2', platforms: ['mobile', 'desktop'] },
			appVersion: '3.0.2',
			shouldSupportDesktop: true,
			shouldSupportMobile: true,
		},
		{
			manifest: { app_min_version: '31.0.2', platforms: ['mobile', 'desktop'] },
			appVersion: '3.0.2',
			shouldSupportDesktop: false,
			shouldSupportMobile: false,
		},
		{
			manifest: { app_min_version: '1.0.2', platforms: ['desktop', 'mobile'] },
			appVersion: '3.1.5',
			shouldSupportDesktop: true,
			shouldSupportMobile: true,
		},

		// Should support the case where the mobile min_version is different from the desktop
		{
			manifest: { app_min_version: '6.0', app_min_version_mobile: '2.0', platforms: ['desktop', 'mobile'] },
			appVersion: '2.1.0',
			shouldSupportDesktop: false,
			shouldSupportMobile: true,
		},
		{
			manifest: { app_min_version: '2.0', app_min_version_mobile: '3.0' },
			appVersion: '2.1.0',
			shouldSupportDesktop: true,
			shouldSupportMobile: false,
		},
		{
			manifest: { app_min_version: '3.0.2', app_min_version_mobile: '3.0.3', platforms: ['mobile'] },
			appVersion: '3.0.4',
			shouldSupportDesktop: false,
			shouldSupportMobile: true,
		},
	])('should correctly return whether a plugin is compatible with a given version of Joplin (case %#: %j)', ({ manifest, appVersion, shouldSupportDesktop, shouldSupportMobile }) => {
		const fullManifest = {
			id: 'com.example.id',
			...manifest,
		};
		const mobileCompatible = isCompatible(appVersion, AppType.Mobile, fullManifest);
		expect(mobileCompatible).toBe(shouldSupportMobile);
		const desktopCompatible = isCompatible(appVersion, AppType.Desktop, fullManifest);
		expect(desktopCompatible).toBe(shouldSupportDesktop);
	});
});
