import MdToHtml from '@joplin/renderer/MdToHtml';
const { filename } = require('@joplin/lib/path-utils');
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import shim from '@joplin/lib/shim';
const { themeStyle } = require('@joplin/lib/theme');

function newTestMdToHtml(options: any = null) {
	options = {
		ResourceModel: {
			isResourceUrl: () => false,
		},
		fsDriver: shim.fsDriver(),
		...options,
	};

	return new MdToHtml(options);
}

describe('MdToHtml', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should convert from Markdown to Html', (async () => {
		const basePath = `${__dirname}/md_to_html`;
		const files = await shim.fsDriver().readDirStats(basePath);
		const mdToHtml = newTestMdToHtml();

		for (let i = 0; i < files.length; i++) {
			const mdFilename = files[i].path;
			if (mdFilename.indexOf('.md') < 0) continue;

			const mdFilePath = `${basePath}/${mdFilename}`;
			const htmlPath = `${basePath}/${filename(mdFilePath)}.html`;

			// if (mdFilename !== 'sanitize_9.md') continue;

			const mdToHtmlOptions: any = {
				bodyOnly: true,
			};

			if (mdFilename === 'checkbox_alternative.md') {
				mdToHtmlOptions.plugins = {
					checkbox: {
						checkboxRenderingType: 2,
					},
				};
			}

			const markdown = await shim.fsDriver().readFile(mdFilePath);
			let expectedHtml = await shim.fsDriver().readFile(htmlPath);

			const result = await mdToHtml.render(markdown, null, mdToHtmlOptions);
			let actualHtml = result.html;

			expectedHtml = expectedHtml.replace(/\r?\n/g, '\n');
			actualHtml = actualHtml.replace(/\r?\n/g, '\n');

			if (actualHtml !== expectedHtml) {
				const msg: string[] = [
					'',
					`Error converting file: ${mdFilename}`,
					'--------------------------------- Got:',
					actualHtml,
					'--------------------------------- Raw:',
					actualHtml.split('\n'),
					'--------------------------------- Expected:',
					expectedHtml.split('\n'),
					'--------------------------------------------',
					'',
				];

				// eslint-disable-next-line no-console
				console.info(msg.join('\n'));

				expect(false).toBe(true);
				// return;
			} else {
				expect(true).toBe(true);
			}
		}
	}));

	it('should return enabled plugin assets', (async () => {
		const pluginOptions: any = {};
		const pluginNames = MdToHtml.pluginNames();

		for (const n of pluginNames) pluginOptions[n] = { enabled: false };

		{
			const mdToHtml = newTestMdToHtml({ pluginOptions: pluginOptions });
			const assets = await mdToHtml.allAssets(themeStyle(1));
			expect(assets.length).toBe(1); // Base note style should always be returned
		}

		{
			pluginOptions['checkbox'].enabled = true;
			const mdToHtml = newTestMdToHtml({ pluginOptions: pluginOptions });

			const assets = await mdToHtml.allAssets(themeStyle(1));
			expect(assets.length).toBe(2);
			expect(assets[1].mime).toBe('text/css');

			const content = await shim.fsDriver().readFile(assets[1].path);
			expect(content.indexOf('joplin-checklist') >= 0).toBe(true);
		}
	}));

	it('should wrapped the rendered Markdown', (async () => {
		const mdToHtml = newTestMdToHtml();

		// In this case, the HTML contains both the style and
		// the rendered markdown wrapped in a DIV.
		const result = await mdToHtml.render('just **testing**');
		expect(result.cssStrings.length).toBeGreaterThan(0);
		expect(result.html.indexOf('rendered-md') >= 0).toBe(true);
	}));

	it('should return the rendered body only', (async () => {
		const mdToHtml = newTestMdToHtml();

		// In this case, the HTML contains only the rendered markdown, with
		// no wrapper and no style. The style is instead in the cssStrings
		// property.
		{
			const result = await mdToHtml.render('just **testing**', null, { bodyOnly: true });
			expect(result.cssStrings.length).toBeGreaterThan(0);
			expect(result.html.trim()).toBe('just <strong>testing</strong>');
		}

		// But it should not remove the wrapping <p> tags if there's more
		// than one line
		{
			const result = await mdToHtml.render('one\n\ntwo', null, { bodyOnly: true });
			expect(result.html.trim()).toBe('<p>one</p>\n<p>two</p>');
		}
	}));

	it('should render an empty string', (async () => {
		const mdToHtml = newTestMdToHtml();
		const result = await mdToHtml.render('', null, { splitted: true });
		// The TinyMCE component checks for this exact string to apply a hack,
		// so make sure it doesn't change from version to version.
		expect(result.html).toBe('<div id="rendered-md"></div>');
	}));

	it('should split HTML and CSS', (async () => {
		const mdToHtml = newTestMdToHtml();

		// It is similar to the bodyOnly option, excepts that the rendered
		// Markdown is wrapped in a DIV
		const result = await mdToHtml.render('just **testing**', null, { splitted: true });
		expect(result.cssStrings.length).toBeGreaterThan(0);
		expect(result.html.trim()).toBe('<div id="rendered-md"><p>just <strong>testing</strong></p>\n</div>');
	}));

	it('should render links correctly', (async () => {
		const testCases = [
			// 0: input
			// 1: output with linkify = off
			// 2: output with linkify = on
			[
				'https://example.com',
				'https://example.com',
				'<a data-from-md title=\'https://example.com\' href=\'https://example.com\'>https://example.com</a>',
			],
			[
				'file://C:\\AUTOEXEC.BAT',
				'file://C:\\AUTOEXEC.BAT',
				'<a data-from-md title=\'file://C:%5CAUTOEXEC.BAT\' href=\'file://C:%5CAUTOEXEC.BAT\'>file://C:\\AUTOEXEC.BAT</a>',
			],
			[
				'example.com',
				'example.com',
				'example.com',
			],
			[
				'oo.ps',
				'oo.ps',
				'oo.ps',
			],
			[
				'test@example.com',
				'test@example.com',
				'test@example.com',
			],
			[
				'<https://example.com>',
				'<a data-from-md title=\'https://example.com\' href=\'https://example.com\'>https://example.com</a>',
				'<a data-from-md title=\'https://example.com\' href=\'https://example.com\'>https://example.com</a>',
			],
			[
				'[ok](https://example.com)',
				'<a data-from-md title=\'https://example.com\' href=\'https://example.com\'>ok</a>',
				'<a data-from-md title=\'https://example.com\' href=\'https://example.com\'>ok</a>',
			],
			[
				'[bla.pdf](file:///Users/tessus/Downloads/bla.pdf)',
				'<a data-from-md title=\'file:///Users/tessus/Downloads/bla.pdf\' href=\'file:///Users/tessus/Downloads/bla.pdf\'>bla.pdf</a>',
				'<a data-from-md title=\'file:///Users/tessus/Downloads/bla.pdf\' href=\'file:///Users/tessus/Downloads/bla.pdf\'>bla.pdf</a>',
			],
		];

		const mdToHtmlLinkifyOn = newTestMdToHtml({
			pluginOptions: {
				linkify: { enabled: true },
			},
		});

		const mdToHtmlLinkifyOff = newTestMdToHtml({
			pluginOptions: {
				linkify: { enabled: false },
			},
		});

		for (const testCase of testCases) {
			const [input, expectedLinkifyOff, expectedLinkifyOn] = testCase;

			{
				const actual = await mdToHtmlLinkifyOn.render(input, null, {
					bodyOnly: true,
					plainResourceRendering: true,
				});

				expect(actual.html).toBe(expectedLinkifyOn);
			}

			{
				const actual = await mdToHtmlLinkifyOff.render(input, null, {
					bodyOnly: true,
					plainResourceRendering: true,
				});

				expect(actual.html).toBe(expectedLinkifyOff);
			}
		}
	}));

	it('should return attributes of line numbers', (async () => {
		const mdToHtml = newTestMdToHtml();

		// Mapping information between source lines and html elements is
		// annotated.
		{
			const input = '# Head\nFruits\n- Apple\n';
			const result = await mdToHtml.render(input, null, { bodyOnly: true, mapsToLine: true });
			expect(result.html.trim()).toBe('<h1 id="head" class="maps-to-line" source-line="0" source-line-end="1">Head</h1>\n' +
				'<p class="maps-to-line" source-line="1" source-line-end="2">Fruits</p>\n' +
				'<ul>\n<li class="maps-to-line" source-line="2" source-line-end="3">Apple</li>\n</ul>'
			);
		}
	}));

	test('should not make cache inconsistent', (async () => {

		const codeTheme = 'atom-one-light.css';

		const mdToHtml = newTestMdToHtml({
			codeTheme: codeTheme,
			theme: themeStyle(1),
			externalAssetsOnly: false,
		});

		async function renderCall(inputText: string) {
			const result = await mdToHtml.render(inputText, themeStyle(1), {
				bodyOnly: false,
				plainResourceRendering: true,
				splitted: true,
				externalAssetsOnly: true,
				contentMaxWidth: 0,
			});
			return { ...result, pluginAssets: result.pluginAssets.slice() };
		}

		const cacheKey = themeStyle(1).cacheKey + codeTheme;

		const firstRender = await renderCall('# First render call');
		const firstCacheRetrieval = { ...mdToHtml['allProcessedAssets_'][cacheKey], pluginAssets: mdToHtml['allProcessedAssets_'][cacheKey].pluginAssets.slice() };

		const secondRender = await renderCall('# Second render call');
		const secondCacheRetrieval = { ...mdToHtml['allProcessedAssets_'][cacheKey], pluginAssets: mdToHtml['allProcessedAssets_'][cacheKey].pluginAssets.slice() };

		expect(firstCacheRetrieval).toStrictEqual(secondCacheRetrieval);
		expect(firstRender.cssStrings).toBeUndefined();
		expect(secondRender.cssStrings).toBeUndefined();
		expect(firstRender.pluginAssets).toStrictEqual(secondRender.pluginAssets);
		expect(firstRender.pluginAssets).not.toEqual(firstCacheRetrieval.pluginAssets);
		expect(secondRender.pluginAssets).not.toEqual(secondCacheRetrieval.pluginAssets);
	}));
});
