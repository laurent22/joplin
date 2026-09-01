import { join } from 'path';
import Setting, { AppType } from '../../../models/Setting';
import { setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../../testing/test-utils';
import { checkSyncConfig, ConfigScreenComponent, defaultScreenState, settingsSections } from './config-shared';

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

	it('should fail validation if there are client certificate errors', async () => {
		Setting.setValue('net.clientCertificate', '');

		const mockComponent: ConfigScreenComponent = {
			settingToComponent: jest.fn(),
			sectionToComponent: jest.fn(),

			state: {
				...defaultScreenState,
				settings: {
					...Setting.toPlainObject(),
					'net.clientCertificate': join(supportDir, 'does-not-exist'),
				},
			},
			setState(this: ConfigScreenComponent, state) {
				if (typeof state === 'function') {
					this.state = state(this.state);
				} else {
					this.state = {
						...this.state,
						...state,
					};
				}
			},
		};

		await checkSyncConfig(mockComponent, mockComponent.state.settings);
		expect(mockComponent.state.checkSyncConfigResult).toMatchObject({ ok: false });

		await checkSyncConfig(mockComponent, {
			...mockComponent.state.settings,
			'net.clientCertificate': '',
		});
		expect(mockComponent.state.checkSyncConfigResult).toMatchObject({
			ok: true, errorMessage: '',
		});
	});
});
