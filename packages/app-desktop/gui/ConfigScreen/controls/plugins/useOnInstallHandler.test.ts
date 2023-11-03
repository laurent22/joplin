import useOnInstallHandler from './useOnInstallHandler';
import { renderHook } from '@testing-library/react-hooks';

import PluginService, { defaultPluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { ItemEvent } from './PluginBox';

jest.mock('@joplin/lib/services/plugins/PluginService');

const pluginServiceInstance = {
	updatePluginFromRepo: jest.fn(),
	installPluginFromRepo: jest.fn(),
};

const pluginId = 'test.plugin';
const setInstallingPluginIds = jest.fn();
const repoApi = jest.fn();
const onPluginSettingsChange = jest.fn();
const itemEvent = ({
	item: { manifest: { id: pluginId } },
} as ItemEvent);
const callHook = (isUpdate: boolean, pluginEnabled = true, pluginInstalledViaGUI = true) => () => useOnInstallHandler(
	setInstallingPluginIds,
	{
		[pluginId]: pluginInstalledViaGUI ? {
			enabled: pluginEnabled,
			deleted: false,
			hasBeenUpdated: false,
		} : undefined,
	},
	repoApi,
	onPluginSettingsChange,
	isUpdate,
);

describe('useOnInstallHandler', () => {

	beforeAll(() => {
		(PluginService.instance as jest.Mock).mockReturnValue(pluginServiceInstance);
		(defaultPluginSetting as jest.Mock).mockImplementation(
			jest.requireActual('@joplin/lib/services/plugins/PluginService').defaultPluginSetting,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should report that the plugin is being updated', async () => {
		const { result: { current: onUpdate } } = renderHook(callHook(true));
		await onUpdate(itemEvent);

		expect(setInstallingPluginIds).toHaveBeenCalledTimes(2);
		expect(setInstallingPluginIds.mock.calls[0][0]({})).toMatchObject({ [pluginId]: true });
		expect(setInstallingPluginIds.mock.calls[1][0]({})).toMatchObject({ [pluginId]: false });
	});

	test('should update the plugin when there is an update', async () => {
		const { result: { current: onUpdate } } = renderHook(callHook(true));
		await onUpdate(itemEvent);

		expect(pluginServiceInstance.updatePluginFromRepo).toHaveBeenCalledWith(undefined, pluginId);
	});

	test('should install the plugin when it is not yet installed', async () => {
		const { result: { current: onInstall } } = renderHook(callHook(false));
		await onInstall(itemEvent);

		expect(pluginServiceInstance.installPluginFromRepo).toHaveBeenCalledWith(undefined, pluginId);
	});

	test('should preserve the enabled flag when plugin is updated', async () => {
		const { result: { current: onUpdate } } = renderHook(callHook(true, false));
		await onUpdate(itemEvent);

		const newSettings = onPluginSettingsChange.mock.calls[0][0].value;
		expect(newSettings[pluginId].enabled).toBe(false);
	});

	test('should indicate it when plugin has been updated', async () => {
		const { result: { current: onUpdate } } = renderHook(callHook(true));
		await onUpdate(itemEvent);

		const newSettings = onPluginSettingsChange.mock.calls[0][0].value;
		expect(newSettings[pluginId].hasBeenUpdated).toBe(true);
	});

	test('should not fail when plugin was not installed through the GUI', async () => {
		const { result: { current: onUpdate } } = renderHook(callHook(true, true, false));
		await onUpdate(itemEvent);
	});
});
