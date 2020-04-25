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
const HtmlToHtml = require('lib/joplin-renderer/HtmlToHtml');
const { enexXmlToMd } = require('lib/import-enex-md-gen.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 60 * 1000; // Can run for a while since everything is in the same test unit

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('HtmlToHtml', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should convert from Html to Html', asyncTest(async () => {
		const basePath = `${__dirname}/html_to_html`;
		const files = await shim.fsDriver().readDirStats(basePath);
		const htmlToHtml = new HtmlToHtml();

		for (let i = 0; i < files.length; i++) {
			const htmlSourceFilename = files[i].path;
			if (htmlSourceFilename.indexOf('.src.html') < 0) continue;

			const htmlSourceFilePath = `${basePath}/${htmlSourceFilename}`;
			const htmlDestPath = `${basePath}/${filename(filename(htmlSourceFilePath))}.dest.html`;

			// if (htmlSourceFilename !== 'table_with_header.html') continue;

			const htmlToHtmlOptions = {
				bodyOnly: true,
			};

			const sourceHtml = await shim.fsDriver().readFile(htmlSourceFilePath);
			let expectedHtml = await shim.fsDriver().readFile(htmlDestPath);

			const result = await htmlToHtml.render(sourceHtml, null, htmlToHtmlOptions);
			let actualHtml = result.html;

			if (os.EOL === '\r\n') {
				expectedHtml = expectedHtml.replace(/\r\n/g, '\n');
				actualHtml = actualHtml.replace(/\r\n/g, '\n');
			}

			if (actualHtml !== expectedHtml) {
				console.info('');
				console.info(`Error converting file: ${htmlSourceFilename}`);
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

});
