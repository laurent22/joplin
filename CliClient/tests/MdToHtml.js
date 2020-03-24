/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const os = require('os');
const { time } = require('lib/time-utils.js');
const { filename } = require('lib/path-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim');
const MdToHtml = require('lib/joplin-renderer/MdToHtml');
const { enexXmlToMd } = require('lib/import-enex-md-gen.js');
const { themeStyle } = require('../../ElectronClient/theme.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 60 * 1000; // Can run for a while since everything is in the same test unit

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

function newTestMdToHtml(options = null) {
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

	beforeEach(async (done) => {
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

			const mdToHtmlOptions = {
				bodyOnly: true,
			};

			if (mdFilename === 'checkbox_alternative.md') {
				mdToHtmlOptions.plugins = {
					checkbox: {
						renderingType: 2,
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
		const pluginOptions = {};
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
		expect(result.cssStrings.length).toBe(0);
		expect(result.html.indexOf('rendered-md') >= 0).toBe(true);
	}));

	it('should return the rendered body only', asyncTest(async () => {
		const mdToHtml = newTestMdToHtml();

		// In this case, the HTML contains only the rendered markdown,
		// with no wrapper and no style.
		// The style is instead in the cssStrings property.
		const result = await mdToHtml.render('just **testing**', null, { bodyOnly: true });
		expect(result.cssStrings.length).toBe(1);
		expect(result.html.trim()).toBe('<p>just <strong>testing</strong></p>');
	}));

	it('should split HTML and CSS', asyncTest(async () => {
		const mdToHtml = newTestMdToHtml();

		// It is similar to the bodyOnly option, excepts that
		// the rendered Markdown is wrapped in a DIV
		const result = await mdToHtml.render('just **testing**', null, { splitted: true });
		expect(result.cssStrings.length).toBe(1);
		expect(result.html.trim()).toBe('<div id="rendered-md"><p>just <strong>testing</strong></p>\n</div>');
	}));


});
