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
const { enexXmlToHtml } = require('lib/import-enex-html-gen.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 60 * 1000; // Can run for a while since everything is in the same test unit

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

/**
 * Tests the importer for a single note.
 *
 * In other words, this does not test the importing of an entire exported
 * `.enex` archive, but rather a node of such a file. Thus, the test data files
 * (e.g. `./enex_to_html/code1.enex`) correspond to the contents of a single
 * `<note>...</note>` node in an `.enex` file already extracted from
 * `<content><![CDATA[...]]</content>`.
 */
describe('EnexToHtml', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should convert from Enex to Markdown', asyncTest(async () => {
		const basePath = __dirname + '/enex_to_html';
		const files = await shim.fsDriver().readDirStats(basePath);

		console.log(files);
		for (let i = 0; i < files.length; i++) {
			const enexFilename = files[i].path;
			if (enexFilename.indexOf('.html') < 0) continue;

			const enexPath = basePath + '/' + enexFilename;
			const htmlPath = basePath + '/' + filename(enexFilename) + '.html';

			// // if (enexFilename !== 'multiline_inner_text.html') continue;

			const html = await shim.fsDriver().readFile(enexPath);
			let expectedHtml = await shim.fsDriver().readFile(htmlPath);

			let actualHtml = await enexXmlToHtml(html, []);

			// if (os.EOL === '\r\n') {
			// 	expectedHtml = expectedHtml.replace(/\r\n/g, '\n');
			// 	actualHtml = actualHtml.replace(/\r\n/g, '\n');
			// }

			console.log(expectedHtml);
			console.log('====================');
			console.log(actualHtml);

			if (actualHtml !== expectedHtml) {
				console.info('');
				console.info('Error converting file: ' + enexFilename);
				console.info('--------------------------------- Got:');
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
