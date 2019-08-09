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
		const files = [
			'checklist-list',
			'en-media-image',
		];

		for (let i = 0; i < files.length; i++) {
			const filename = files[i];
			const enexInputPath = `${basePath}/${filename}.enex`;
			const htmlOutputPath = `${basePath}/${filename}.html`;

			const enexInput = await shim.fsDriver().readFile(enexInputPath);
			const expectedOutput = await shim.fsDriver().readFile(htmlOutputPath);

			const resources = [{
				filename: '',
				id: '89ce7da62c6b2832929a6964237e98e9', // Mock id
				mime: 'image/jpeg',
				size: 50347,
				title: '',
			}];
			const actualOutput = await enexXmlToHtml(enexInput, resources);

			if (actualOutput !== expectedOutput) {
				console.info('');
				console.info(`Error converting file: ${filename}.enex`);
				console.info('--------------------------------- Received:');
				console.info(actualOutput.split('\n'));
				console.info('--------------------------------- Expected:');
				console.info(expectedOutput.split('\n'));
				console.info('--------------------------------------------');
				console.info('');

				expect(false).toBe(true);
			}
		}
	}));

});
