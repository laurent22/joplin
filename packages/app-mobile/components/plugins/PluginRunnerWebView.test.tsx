import * as React from 'react';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { AppState } from '../../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import PluginRunnerWebView from './PluginRunnerWebView';
import TestProviderStack from '../testing/TestProviderStack';
import { act, render, screen, waitFor } from '../../utils/testing/testingLibrary';
import createTestPlugin from '@joplin/lib/testing/plugins/createTestPlugin';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';
import Setting from '@joplin/lib/models/Setting';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import CommandService from '@joplin/lib/services/CommandService';

let store: Store<AppState>;

interface WrapperProps { }

const WrappedPluginRunnerWebView: React.FC<WrapperProps> = _props => {
	return <TestProviderStack store={store}>
		<PluginRunnerWebView/>
	</TestProviderStack>;
};

const defaultManifestProperties = {
	manifest_version: 1,
	version: '0.1.0',
	app_min_version: '2.3.4',
	platforms: ['desktop', 'mobile'],
	name: 'Some plugin name',
};

type PluginSlice = { manifest: { id: string } };
const waitForPluginToLoad = (plugin: PluginSlice) => {
	return waitFor(async () => {
		expect(PluginService.instance().pluginById(plugin.manifest.id)).toBeTruthy();
	});
};

const webViewId = 'joplin__PluginDialogWebView';
const getUserWebViewDom = () => getWebViewDomById(webViewId);

describe('PluginRunnerWebView', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);

		store = createMockReduxStore();
		setupGlobalStore(store);
		Setting.setValue('plugins.pluginSupportEnabled', true);
	});

	test('should load a plugin that shows a dialog', async () => {
		const testPlugin = await createTestPlugin({
			...defaultManifestProperties,
			id: 'org.joplinapp.dialog-test',
		}, {
			onStart: `
				const dialogs = joplin.views.dialogs;
				const dialogHandle = await dialogs.create('test-dialog');
				await dialogs.setHtml(
					dialogHandle,
					'<h1>Test!</h1>',
				);
				await joplin.views.dialogs.open(dialogHandle)
			`,
		});
		render(<WrappedPluginRunnerWebView/>);
		await waitForPluginToLoad(testPlugin);

		// Should show the dialog
		await waitFor(async () => {
			const dom = await getUserWebViewDom();
			expect(dom.querySelector('h1').textContent).toBe('Test!');
		});
	});

	test('should load a plugin that adds a panel', async () => {
		const testPlugin = await createTestPlugin({
			...defaultManifestProperties,
			id: 'org.joplinapp.panel-test',
		}, {
			onStart: `
				const panels = joplin.views.panels;
				const handle = await panels.create('test-panel');
				await panels.setHtml(
					handle,
					'<h1>Panel content</h1><p>Test</p>',
				);

				const commands = joplin.commands;
				await commands.register({
					name: 'hideTestPanel',
					label: 'Hide the test plugin panel',
					execute: async () => {
						await panels.hide(handle);
					},
				});

				await commands.register({
					name: 'showTestPanel',
					execute: async () => {
						await panels.show(handle);
					},
				});
			`,
		});
		render(<WrappedPluginRunnerWebView/>);
		await waitForPluginToLoad(testPlugin);

		act(() => {
			store.dispatch({ type: 'SET_PLUGIN_PANELS_DIALOG_VISIBLE', visible: true });
		});

		const expectPanelVisible = async () => {
			const dom = await getUserWebViewDom();
			await waitFor(async () => {
				expect(dom.querySelector('h1').textContent).toBe('Panel content');
			});
		};
		await expectPanelVisible();

		// Should hide the panel
		await act(() => CommandService.instance().execute('hideTestPanel'));
		await waitFor(() => {
			expect(screen.queryByTestId('webViewId')).toBeNull();
		});

		// Should show the panel again
		await act(() => CommandService.instance().execute('showTestPanel'));
		await expectPanelVisible();
	});
});
