require('app-module-path').addPath(__dirname);

const { time } = require('lib/time-utils.js');
const { filename } = require('lib/path-utils.js');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');
const { shim } = require('lib/shim');
const HtmlToMd = require('lib/HtmlToMd');
const { enexXmlToMd } = require('lib/import-enex-md-gen.js');

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60 * 60 * 1000; // Can run for a while since everything is in the same test unit

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('HtmlToMd', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should convert from Html to Markdown', asyncTest(async () => {
		const basePath = __dirname + '/html_to_md';
		const files = await shim.fsDriver().readDirStats(basePath);
		const htmlToMd = new HtmlToMd();
		
		for (let i = 0; i < files.length; i++) {
			const htmlFilename = files[i].path;
			if (htmlFilename.indexOf('.html') < 0) continue;

			const htmlPath = basePath + '/' + htmlFilename;
			const mdPath = basePath + '/' + filename(htmlFilename) + '.md';

			// if (htmlFilename !== 'anchor_with_url_with_spaces.html') continue;

			const html = await shim.fsDriver().readFile(htmlPath);
			const expectedMd = await shim.fsDriver().readFile(mdPath);

			const actualMd = await htmlToMd.parse('<div>' + html + '</div>', []);

			if (actualMd !== expectedMd) {
				console.info('');
				console.info('Error converting file: ' + htmlFilename);
				console.info('--------------------------------- Got:');
				console.info(actualMd);
				console.info('--------------------------------- Raw:');
				console.info(actualMd.split('\n'));
				console.info('--------------------------------- Expected:');
				console.info(expectedMd.split('\n'));
				console.info('--------------------------------------------');
				console.info('');

				expect(false).toBe(true);
				// return;
			} else {
				expect(true).toBe(true)
			}
		}
	}));

});