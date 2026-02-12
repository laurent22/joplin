/** @jest-environment jsdom */
import Setting from '@joplin/lib/models/Setting';
import Renderer, { RenderSettings, RendererSetupOptions } from './Renderer';
import shim from '@joplin/lib/shim';
import { MarkupLanguage } from '@joplin/renderer';

const defaultRendererSettings: RenderSettings = {
	theme: JSON.stringify({ cacheKey: 'test' }),
	highlightedKeywords: [],
	resources: {},
	codeTheme: 'atom-one-light.css',
	noteHash: '',
	initialScrollPercent: 0,
	readAssetBlob: async (_path: string) => new Blob(),
	removeUnusedPluginAssets: true,

	createEditPopupSyntax: '',
	destroyEditPopupSyntax: '',
	pluginAssetContainerSelector: '#asset-container',
	splitted: false,

	pluginSettings: {},
	requestPluginSetting: () => { },
};

const makeRenderer = (options: Partial<RendererSetupOptions>) => {
	const defaultSetupOptions: RendererSetupOptions = {
		settings: {
			safeMode: false,
			tempDir: Setting.value('tempDir'),
			resourceDir: Setting.value('resourceDir'),
			resourceDownloadMode: 'auto',
		},
		useTransferredFiles: false,
		fsDriver: shim.fsDriver(),
		pluginOptions: {},
	};
	return new Renderer({ ...options, ...defaultSetupOptions });
};

const getRenderedContent = () => {
	return document.querySelector('#joplin-container-content > #rendered-md');
};

describe('Renderer', () => {
	beforeEach(() => {
		const contentContainer = document.createElement('div');
		contentContainer.id = 'joplin-container-content';
		document.body.appendChild(contentContainer);

		const pluginAssetsContainer = document.createElement('div');
		pluginAssetsContainer.id = 'asset-container';
		document.body.appendChild(pluginAssetsContainer);
	});

	afterEach(() => {
		document.querySelector('#joplin-container-content')?.remove();
		document.querySelector('#asset-container')?.remove();
	});

	test('should support rendering markdown', async () => {
		const renderer = makeRenderer({});
		await renderer.rerenderToBody(
			{ language: MarkupLanguage.Markdown, markup: '**test**' },
			defaultRendererSettings,
		);

		expect(getRenderedContent().innerHTML.trim()).toBe('<p><strong>test</strong></p>');

		await renderer.rerenderToBody(
			{ language: MarkupLanguage.Markdown, markup: '*test*' },
			defaultRendererSettings,
		);
		expect(getRenderedContent().innerHTML.trim()).toBe('<p><em>test</em></p>');
	});

	test('should support adding and removing plugin scripts', async () => {
		const renderer = makeRenderer({});
		await renderer.setExtraContentScriptsAndRerender([
			{
				id: 'test',
				js: `
					((context) => {
						return {
							plugin: (markdownIt) => {
								markdownIt.renderer.rules.fence = (tokens, idx) => {
									return '<div id="test">Test from ' + context.pluginId + '</div>';
								};
							},
						};
					})
				`,
				assetPath: Setting.value('tempDir'),
				pluginId: 'com.example.test-plugin',
			},
		]);
		await renderer.rerenderToBody(
			{ language: MarkupLanguage.Markdown, markup: '```\ntest\n```' },
			defaultRendererSettings,
		);
		expect(getRenderedContent().innerHTML.trim()).toBe('<div id="test">Test from com.example.test-plugin</div>');

		// Should support removing plugin scripts
		await renderer.setExtraContentScriptsAndRerender([]);
		await renderer.rerenderToBody(
			{ language: MarkupLanguage.Markdown, markup: '```\ntest\n```' },
			defaultRendererSettings,
		);
		expect(getRenderedContent().innerHTML.trim()).not.toContain('com.example.test-plugin');
		expect(getRenderedContent().querySelectorAll('pre.joplin-source')).toHaveLength(1);
	});

	test('should call .requestPluginSetting when a setting is missing', async () => {
		const renderer = makeRenderer({});

		const requestPluginSetting = jest.fn();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const rerenderToBody = (pluginSettings: Record<string, any>) => {
			return renderer.rerenderToBody(
				{ language: MarkupLanguage.Markdown, markup: '```\ntest\n```' },
				{ ...defaultRendererSettings, pluginSettings, requestPluginSetting },
			);
		};

		await rerenderToBody({});
		expect(requestPluginSetting).toHaveBeenCalledTimes(0);

		const pluginId = 'com.example.test-plugin';
		await renderer.setExtraContentScriptsAndRerender([
			{
				id: 'test-content-script',
				js: `
					(() => {
						return {
							plugin: (markdownIt, options) => {
								const settingValue = options.settingValue('setting');
								markdownIt.renderer.rules.fence = (tokens, idx) => {
									return '<div id="setting-value">Setting value: ' + settingValue + '</div>';
								};
							},
						};
					})
				`,
				assetPath: Setting.value('tempDir'),
				pluginId,
			},
		]);

		// Should call .requestPluginSetting for missing settings
		expect(requestPluginSetting).toHaveBeenCalledTimes(1);
		await rerenderToBody({ someOtherSetting: 1 });
		expect(requestPluginSetting).toHaveBeenCalledTimes(2);
		expect(requestPluginSetting).toHaveBeenLastCalledWith('com.example.test-plugin', 'setting');

		// Should still render
		expect(getRenderedContent().querySelector('#setting-value').innerHTML).toBe('Setting value: undefined');

		// Should expect only namespaced plugin settings
		await rerenderToBody({ 'setting': 'test' });
		expect(requestPluginSetting).toHaveBeenCalledTimes(3);

		// Should not request plugin settings when all settings are present.
		await rerenderToBody({ [`${pluginId}.setting`]: 'test' });
		expect(requestPluginSetting).toHaveBeenCalledTimes(3);
		expect(getRenderedContent().querySelector('#setting-value').innerHTML).toBe('Setting value: test');
	});
});
