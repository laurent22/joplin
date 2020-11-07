import MdToHtml from '@joplin/renderer/MdToHtml';
const os = require('os');
const { filename } = require('@joplin/lib/path-utils');
const { asyncTest, setupDatabaseAndSynchronizer, switchClient } = require('./test-utils.js');
const shim = require('@joplin/lib/shim').default;
const { themeStyle } = require('@joplin/lib/theme');

function newTestMdToHtml(options:any = null) {
	options = {
		ResourceModel: {
			isResourceUrl: () => false,
		},
		fsDriver: shim.fsDriver(),
		...options,
	};

	return  new MdToHtml(options);
}

describe('MdToHtml', function() {

	beforeEach(async (done:Function) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should convert from Markdown to Html', asyncTest(async () => {
		const basePath = `${__dirname}/md_to_html`;
		const files = await shim.fsDriver().readDirStats(basePath);
		const mdToHtml = newTestMdToHtml();

		for (let i = 0; i < files.length; i++) {
			const mdFilename = files[i].path;
			if (mdFilename.indexOf('.md') < 0) continue;

			const mdFilePath = `${basePath}/${mdFilename}`;
			const htmlPath = `${basePath}/${filename(mdFilePath)}.html`;

			// if (mdFilename !== 'sanitize_9.md') continue;

			const mdToHtmlOptions:any = {
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

			if (os.EOL === '\r\n') {
				expectedHtml = expectedHtml.replace(/\r\n/g, '\n');
				actualHtml = actualHtml.replace(/\r\n/g, '\n');
			}

			if (actualHtml !== expectedHtml) {
				console.info('');
				console.info(`Error converting file: ${mdFilename}`);
				console.info('--------------------------------- Got:');
				console.info(actualHtml);
				console.info('--------------------------------- Raw:');
				console.info(actualHtml.split('\n'));
				console.info('--------------------------------- Expected:');
				console.info(expectedHtml.split('\n'));
				console.info('--------------------------------------------');
				console.info('');

				expect(false).toBe(true);
				// return;
			} else {
				expect(true).toBe(true);
			}
		}
	}));

	it('should return enabled plugin assets', asyncTest(async () => {
		const pluginOptions:any = {};
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

	it('should wrapped the rendered Markdown', asyncTest(async () => {
		const mdToHtml = newTestMdToHtml();

		// In this case, the HTML contains both the style and
		// the rendered markdown wrapped in a DIV.
		const result = await mdToHtml.render('just **testing**');
		expect(result.cssStrings.length).toBeGreaterThan(0);
		expect(result.html.indexOf('rendered-md') >= 0).toBe(true);
	}));

	it('should return the rendered body only', asyncTest(async () => {
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

	it('should split HTML and CSS', asyncTest(async () => {
		const mdToHtml = newTestMdToHtml();

		// It is similar to the bodyOnly option, excepts that the rendered
		// Markdown is wrapped in a DIV
		const result = await mdToHtml.render('just **testing**', null, { splitted: true });
		expect(result.cssStrings.length).toBeGreaterThan(0);
		expect(result.html.trim()).toBe('<div id="rendered-md"><p>just <strong>testing</strong></p>\n</div>');
	}));

	it('should render links correctly', asyncTest(async () => {
		const mdToHtml = newTestMdToHtml();

		const testCases = [
			// None of these should result in a link
			['https://example.com', 'https://example.com'],
			['file://C:\\AUTOEXEC.BAT', 'file://C:\\AUTOEXEC.BAT'],
			['example.com', 'example.com'],
			['oo.ps', 'oo.ps'],
			['test@example.com', 'test@example.com'],

			// Those should be converted to links
			['<https://example.com>', '<a data-from-md title=\'https://example.com\' href=\'https://example.com\'>https://example.com</a>'],
			['[ok](https://example.com)', '<a data-from-md title=\'https://example.com\' href=\'https://example.com\'>ok</a>'],
		];

		for (const testCase of testCases) {
			const [input, expected] = testCase;
			const actual = await mdToHtml.render(input, null, { bodyOnly: true, plainResourceRendering: true });
			expect(actual.html).toBe(expected);
		}
	}));

});
