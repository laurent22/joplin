import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { renderHook } from '@testing-library/react-hooks';
import usePluginEditorView from './usePluginEditorView';
import { PluginStates, PluginViewState } from '@joplin/lib/services/plugins/reducer';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';

const sampleView = (): PluginViewState => {
	return {
		buttons: [],
		containerType: ContainerType.Editor,
		id: 'view-1',
		opened: true,
		type: 'webview',
	};
};

describe('usePluginEditorView', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should return the plugin editor view if is opened', async () => {
		const pluginStates: PluginStates = {
			'0': {
				contentScripts: {},
				id: '1',
				views: {
					'view-0': {
						...sampleView(),
						id: 'view-0',
						containerType: ContainerType.Panel,
					},
				},
			},
			'1': {
				contentScripts: {},
				id: '1',
				views: {
					'view-1': sampleView(),
				},
			},
		};

		{
			const test = renderHook(() => usePluginEditorView(pluginStates, ['view-1']));
			expect(test.result.current.editorPlugin.id).toBe('1');
			expect(test.result.current.editorView.id).toBe('view-1');
			test.unmount();
		}

		{
			pluginStates['1'].views['view-1'].opened = false;
			const test = renderHook(() => usePluginEditorView(pluginStates, ['view-1']));
			expect(test.result.current.editorPlugin).toBeFalsy();
			test.unmount();
		}
	});

	it('should return a plugin editor view even if multiple editors are conflicting', async () => {
		const pluginStates: PluginStates = {
			'1': {
				contentScripts: {},
				id: '1',
				views: {
					'view-1': sampleView(),
				},
			},
			'2': {
				contentScripts: {},
				id: '2',
				views: {
					'view-2': {
						...sampleView(),
						id: 'view-2',
					},
				},
			},
		};

		{
			const test = renderHook(() => usePluginEditorView(pluginStates, ['view-1']));
			expect(test.result.current.editorPlugin.id).toBe('1');
			expect(test.result.current.editorView.id).toBe('view-1');
			test.unmount();
		}
	});

});
