import MdToHtml, { LinkRenderingType } from '@joplin/renderer/MdToHtml';
const { filename } = require('@joplin/lib/path-utils');
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import shim from '@joplin/lib/shim';
import { RenderOptions } from '@joplin/renderer/types';
import { isResourceUrl, resourceUrlToId } from '@joplin/lib/models/utils/resourceUtils';
const { themeStyle } = require('@joplin/lib/theme');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function newTestMdToHtml(options: any = null) {
	options = {
		ResourceModel: {
			isResourceUrl: isResourceUrl,
			urlToId: resourceUrlToId,
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

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const mdToHtmlOptions: RenderOptions = {
				bodyOnly: true,
			};

			if (mdFilename === 'checkbox_alternative.md') {
				mdToHtmlOptions.plugins = {
					checkbox: {
						checkboxRenderingType: 2,
					},
				};
			} else if (mdFilename.startsWith('sourcemap_')) {
				mdToHtmlOptions.mapsToLine = true;
			} else if (mdFilename.startsWith('resource_')) {
				mdToHtmlOptions.resources = {};
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
					'--------------------------------- Expected (Lines)',
					expectedHtml.split('\n'),
					'--------------------------------- Expected (Text)',
					expectedHtml,
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
				link_open: {
					linkRenderingType: LinkRenderingType.HrefHandler,
				},
			},
		});

		const mdToHtmlLinkifyOff = newTestMdToHtml({
			pluginOptions: {
				linkify: { enabled: false },
			},
		});

		const renderOptions = {
			bodyOnly: true,
			plainResourceRendering: true,
			linkRenderingType: LinkRenderingType.HrefHandler,
		};

		for (const testCase of testCases) {
			const [input, expectedLinkifyOff, expectedLinkifyOn] = testCase;

			{
				const actual = await mdToHtmlLinkifyOn.render(input, null, renderOptions);

				expect(actual.html).toBe(expectedLinkifyOn);
			}

			{
				const actual = await mdToHtmlLinkifyOff.render(input, null, renderOptions);

				expect(actual.html).toBe(expectedLinkifyOff);
			}
		}
	}));

	it.each([
		'[test](http://example.com/)',
		'[test](mailto:test@example.com)',
	])('should add onclick handlers to links when linkRenderingType is JavaScriptHandler (%j)', async (markdown) => {
		const mdToHtml = newTestMdToHtml();

		const renderWithoutOnClickOptions = {
			bodyOnly: true,
			linkRenderingType: LinkRenderingType.HrefHandler,
		};
		expect(
			(await mdToHtml.render(markdown, undefined, renderWithoutOnClickOptions)).html,
		).not.toContain('onclick');

		const renderWithOnClickOptions = {
			bodyOnly: true,
			linkRenderingType: LinkRenderingType.JavaScriptHandler,
		};
		expect(
			(await mdToHtml.render(markdown, undefined, renderWithOnClickOptions)).html,
		).toMatch(/<a data-from-md .*onclick=['"].*['"].*>/);
	});

	it('should return attributes of line numbers', (async () => {
		const mdToHtml = newTestMdToHtml();

		// Mapping information between source lines and html elements is
		// annotated.
		{
			const input = '# Head\nFruits\n- Apple\n';
			const result = await mdToHtml.render(input, null, { bodyOnly: true, mapsToLine: true });
			expect(result.html.trim()).toBe('<h1 id="head" class="maps-to-line" source-line="0" source-line-end="1">Head</h1>\n' +
				'<p class="maps-to-line" source-line="1" source-line-end="2">Fruits</p>\n' +
				'<ul>\n<li class="maps-to-line" source-line="2" source-line-end="3">Apple</li>\n</ul>',
			);
		}
	}));

	it('should attach source blocks to block KaTeX', async () => {
		const mdToHtml = newTestMdToHtml();

		const katex = [
			'3 + 3',
			'\n\\int_0^1 x dx\n\n',
			'\n\\int_0^1 x dx\n3 + 3\n',
			'\n\t2^{3^4}\n\t3 + 3\n',
			'3\n4',
		];
		const surroundingTextChoices = [
			['', ''],
			['Test', ''],
			['Test', 'Test!'],
			['Test\n\n', '\n\nTest!'],
		];

		const tests = [];
		for (const texSource of katex) {
			for (const [start, end] of surroundingTextChoices) {
				tests.push([texSource, `${start}\n$$${texSource}$$\n${end}`]);
			}
		}

		for (const [tex, input] of tests) {
			const html = await mdToHtml.render(input, null, { bodyOnly: true });

			const opening = '<pre class="joplin-source" data-joplin-language="katex" data-joplin-source-open="$$&#10;" data-joplin-source-close="&#10;$$&#10;">';
			const closing = '</pre>';

			// Remove any single leading and trailing newlines, those are included in data-joplin-source-open
			// and data-joplin-source-close.
			const trimmedTex = tex.replace(/^[\n]/, '').replace(/[\n]$/, '');
			expect(html.html).toContain(opening + trimmedTex + closing);
		}
	});

	it('should render inline KaTeX after a numbered equation', async () => {
		const mdToHtml = newTestMdToHtml();

		// This test is intended to verify that inline KaTeX renders correctly
		// after creating a numbered equation with \begin{align}...\end{align}.
		//
		// See https://github.com/laurent22/joplin/issues/9455 for details.

		const markdown = [
			'$$',
			'\\begin{align}\\text{Block}\\end{align}',
			'$$',
			'',
			'$\\text{Inline}$',
		].join('\n');
		const { html } = await mdToHtml.render(markdown, null, { bodyOnly: true });

		// Because we don't control the output of KaTeX, this test should be as general as
		// possible while still verifying that rendering (without an error) occurs.

		// Should have rendered the inline and block content without errors
		expect(html).toContain('Inline</span>');
		expect(html).toContain('Block</span>');
	});

	it('should sanitize KaTeX errors', async () => {
		const markdown = '$\\a<svg>$';
		const renderResult = await newTestMdToHtml().render(markdown, null, { bodyOnly: true });

		// Should not contain the HTML in unsanitized form
		expect(renderResult.html).not.toContain('<svg>');
	});
});
