import useOnInstallHandler from './useOnInstallHandler';
import { renderHook } from '@testing-library/react-hooks';

import PluginService, { defaultPluginSetting, PluginSetting } from '@joplin/lib/services/plugins/PluginService';
import { ItemEvent } from './PluginBox';
import produce from 'immer';

jest.mock('@joplin/lib/services/plugins/PluginService');
jest.mock('immer');

const pluginServiceinstance = {
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
const callHook = (isUpdate: boolean, pluginEnabled = true) => () => useOnInstallHandler(
	setInstallingPluginIds,
	{
		[pluginId]: {
			enabled: pluginEnabled,
			deleted: false,
			hasBeenUpdated: false,
		},
	},
	repoApi,
	onPluginSettingsChange,
	isUpdate
);

describe('useOnInstallHandler', () => {

	beforeAll(() => {
		(PluginService.instance as jest.Mock).mockReturnValue(pluginServiceinstance);
		(defaultPluginSetting as jest.Mock).mockImplementation(
			jest.requireActual('@joplin/lib/services/plugins/PluginService').defaultPluginSetting
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should set updatingPluginIds while updating', async () => {
		const { result: { current: cb } } = renderHook(callHook(true));
		await cb(itemEvent);

		expect(setInstallingPluginIds).toHaveBeenCalledTimes(2);
		expect(setInstallingPluginIds.mock.calls[0][0]({})).toMatchObject({ [pluginId]: true });
		expect(setInstallingPluginIds.mock.calls[1][0]({})).toMatchObject({ [pluginId]: false });
	});

	test('should call updatePluginFromRepo if plugin is updated', async () => {
		const { result: { current: cb } } = renderHook(callHook(true));
		await cb(itemEvent);

		expect(pluginServiceinstance.updatePluginFromRepo).toHaveBeenCalledWith(undefined, pluginId);
	});

	test('should call installPluginFromRepo if plugin is installed', async () => {
		const { result: { current: cb } } = renderHook(callHook(false));
		await cb(itemEvent);

		expect(pluginServiceinstance.installPluginFromRepo).toHaveBeenCalledWith(undefined, pluginId);
	});

	test('when plugin is updated should preserve enabled flag', async () => {
		const { result: { current: cb } } = renderHook(callHook(true, false));
		await cb(itemEvent);

		const draft = { [pluginId]: {} as PluginSetting };
		(produce as jest.Mock).mock.calls[0][1](draft);
		expect(draft[pluginId].enabled).toBe(false);
	});

	test('when plugin is updated should set hasBeenUpdated', async () => {
		const { result: { current: cb } } = renderHook(callHook(true));
		await cb(itemEvent);

		const draft = { [pluginId]: {} as PluginSetting };
		(produce as jest.Mock).mock.calls[0][1](draft);
		expect(draft[pluginId].hasBeenUpdated).toBe(true);
	});

	test('when plugin is updated or installed should call onPluginSettingsChange', async () => {
		const { result: { current: cb } } = renderHook(callHook(true));
		await cb(itemEvent);

		expect(onPluginSettingsChange).toHaveBeenCalled();
	});
});
