import { PluginStates, PluginViewState } from '@joplin/lib/services/plugins/reducer';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import visiblePluginPanelViewInfos, { pluginHasPanelView } from './visiblePluginPanelViewInfos';

const panel = (id: string, opened = true): PluginViewState => ({ id, type: 'webview', buttons: [], opened, containerType: ContainerType.Panel });

const pluginStates: PluginStates = {
	first: {
		id: 'first', contentScripts: {},
		views: { one: panel('one'), two: panel('two') },
	},
	second: {
		id: 'second', contentScripts: {},
		views: { three: panel('three'), closed: panel('closed', false) },
	},
};

describe('visiblePluginPanelViewInfos', () => {
	it('detects a registered panel even when it is closed', () => {
		const hiddenPanelStates: PluginStates = {
			first: { ...pluginStates.first, views: { one: panel('one', false) } },
		};
		expect(pluginHasPanelView(hiddenPanelStates, 'first')).toBe(true);
		expect(pluginHasPanelView(hiddenPanelStates, 'missing')).toBe(false);
	});

	it('shows panels for plugins with no saved preference', () => {
		expect(visiblePluginPanelViewInfos(pluginStates, {}).map(info => info.view.id)).toEqual(['one', 'two', 'three']);
	});

	it('excludes all panels from a plugin whose panel is disabled', () => {
		const settings = { first: { pluginPanelEnabled: false } };
		expect(visiblePluginPanelViewInfos(pluginStates, settings).map(info => info.view.id)).toEqual(['three']);
		expect(visiblePluginPanelViewInfos(pluginStates, { ...settings, second: { pluginPanelEnabled: false } })).toEqual([]);
	});
});
