import Setting, { AppType } from '../../../models/Setting';
import { setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import { settingsSections } from './config-shared';

describe('config-shared', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test.each([
		[AppType.Desktop, false],
		[AppType.Mobile, false],
		[AppType.Desktop, true],
		[AppType.Mobile, true],
	])('should only show the note lock section when the feature flag is on (%s, flag on: %s)', (device, flag) => {
		Setting.setValue('featureFlag.noteLock', flag);
		const sections = settingsSections({ device, settings: Setting.toPlainObject() });
		expect(sections.some(section => section.name === 'noteLock')).toBe(flag);
	});
});
