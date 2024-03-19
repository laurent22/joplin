import Setting from '@joplin/lib/models/Setting';
import Renderer, { RendererSettings, RendererSetupOptions } from './Renderer';
import shim from '@joplin/lib/shim';
import { MarkupLanguage } from '@joplin/renderer';

const defaultRendererSettings: RendererSettings = {
	theme: JSON.stringify({ cacheKey: 'test' }),
	onResourceLoaded: ()=>{},
	highlightedKeywords: [],
	resources: {},
	codeTheme: 'atom-one-light.css',
	noteHash: '',
	initialScroll: 0,

	createEditPopupSyntax: '',
	destroyEditPopupSyntax: '',

	pluginSettings: {},
	requestPluginSetting: ()=>{},
};

const makeRenderer = (options: Partial<RendererSetupOptions>) => {
	const defaultSetupOptions: RendererSetupOptions = {
		settings: {
			safeMode: false,
			tempDir: Setting.value('tempDir'),
			resourceDir: Setting.value('resourceDir'),
			resourceDownloadMode: 'auto',
		},
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
		pluginAssetsContainer.id = 'joplin-container-pluginAssetsContainer';
		document.body.appendChild(pluginAssetsContainer);
	});

	afterEach(() => {
		document.querySelector('#joplin-container-content')?.remove();
		document.querySelector('#joplin-container-pluginAssetsContainer')?.remove();
	});

	test('should support rendering markdown', async () => {
		const renderer = makeRenderer({});
		await renderer.rerender(
			{ language: MarkupLanguage.Markdown, markup: '**test**' },
			defaultRendererSettings,
		);

		expect(getRenderedContent().innerHTML.trim()).toBe('<p><strong>test</strong></p>');

		await renderer.rerender(
			{ language: MarkupLanguage.Markdown, markup: '*test*' },
			defaultRendererSettings,
		);
		expect(getRenderedContent().innerHTML.trim()).toBe('<p><em>test</em></p>');
	});

	test('should support adding and removing plugin scripts', async () => {
		const renderer = makeRenderer({});
		await renderer.setExtraContentScripts([
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
					});
				`,
				assetPath: Setting.value('tempDir'),
				pluginId: 'com.example.test-plugin',
			},
		]);
		await renderer.rerender(
			{ language: MarkupLanguage.Markdown, markup: '```\ntest\n```' },
			defaultRendererSettings,
		);
		expect(getRenderedContent().innerHTML.trim()).toBe('<div id="test">Test from com.example.test-plugin</div>');

		// Should support removing plugin scripts
		await renderer.setExtraContentScripts([]);
		await renderer.rerender(
			{ language: MarkupLanguage.Markdown, markup: '```\ntest\n```' },
			defaultRendererSettings,
		);
		expect(getRenderedContent().innerHTML.trim()).not.toContain('com.example.test-plugin');
		expect(getRenderedContent().querySelectorAll('pre.joplin-source')).toHaveLength(1);
	});
});
