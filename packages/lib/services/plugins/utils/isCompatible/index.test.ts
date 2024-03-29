import { AppType } from '../../../../models/Setting';
import isCompatible from '../isCompatible';

describe('isCompatible', () => {
	test.each([
		// Should support the case where no platform is provided
		{
			manifest: { app_min_version: '2.0' },
			appVersion: '2.1.0',
			shouldSupportDesktop: true,
			shouldSupportMobile: true,
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
			shouldSupportMobile: true,
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

		// Should support including versions with the platform names
		{
			manifest: { app_min_version: '2.0', platforms: ['desktop>=6.0.0', 'mobile'] },
			appVersion: '2.1.0',
			shouldSupportDesktop: false,
			shouldSupportMobile: true,
		},
		{
			manifest: { app_min_version: '2.0', platforms: ['desktop>=2.0.0', 'mobile>=3.2.0'] },
			appVersion: '2.1.0',
			shouldSupportDesktop: true,
			shouldSupportMobile: false,
		},
		{
			manifest: { app_min_version: '3.0.2', platforms: ['mobile>=3.0.3'] },
			appVersion: '3.0.4',
			shouldSupportDesktop: false,
			shouldSupportMobile: true,
		},
		{
			manifest: { app_min_version: '3.0.2', platforms: ['mobile>=3.0.5'] },
			appVersion: '3.0.4',
			shouldSupportDesktop: false,
			shouldSupportMobile: false,
		},

		// Should support unknown platforms
		{
			manifest: { app_min_version: '3.0.2', platforms: ['android>=6', 'mobile', 'foo>=3.0.5'] },
			appVersion: '3.0.4',
			shouldSupportDesktop: false,
			shouldSupportMobile: true,
		},
	])('should correctly return whether a plugin is compatible with a given version of Joplin (case %#: %j)', ({ manifest, appVersion, shouldSupportDesktop, shouldSupportMobile }) => {
		const mobileCompatible = isCompatible(appVersion, AppType.Mobile, manifest);
		expect(mobileCompatible).toBe(shouldSupportMobile);
		const desktopCompatible = isCompatible(appVersion, AppType.Desktop, manifest);
		expect(desktopCompatible).toBe(shouldSupportDesktop);
	});
});
