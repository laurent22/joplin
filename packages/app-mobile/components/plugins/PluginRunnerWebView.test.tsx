import * as React from 'react';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { AppState } from '../../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import PluginRunnerWebView from './PluginRunnerWebView';
import TestProviderStack from '../testing/TestProviderStack';
import { render, waitFor } from '../../utils/testing/testingLibrary';
import createTestPlugin from '@joplin/lib/testing/plugins/createTestPlugin';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';
import Setting from '@joplin/lib/models/Setting';
import PluginService from '@joplin/lib/services/plugins/PluginService';

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

		// Should load the plugin
		await waitFor(async () => {
			expect(PluginService.instance().pluginById(testPlugin.manifest.id)).toBeTruthy();
		});

		// Should show the dialog
		await waitFor(async () => {
			const dom = await getWebViewDomById('joplin__PluginDialogWebView');
			expect(dom.querySelector('h1').textContent).toBe('Test!');
		});
	});
});
