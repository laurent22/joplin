/* eslint-disable no-unused-vars */


const os = require('os');
const time = require('@joplin/lib/time').default;
const { filename } = require('@joplin/lib/path-utils');
const { asyncTest, fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const BaseModel = require('@joplin/lib/BaseModel').default;
const shim = require('@joplin/lib/shim').default;
const { enexXmlToMd } = require('@joplin/lib/import-enex-md-gen.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

describe('EnexToMd', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should convert from Enex to Markdown', asyncTest(async () => {
		const basePath = `${__dirname}/enex_to_md`;
		const files = await shim.fsDriver().readDirStats(basePath);

		for (let i = 0; i < files.length; i++) {
			const htmlFilename = files[i].path;
			if (htmlFilename.indexOf('.html') < 0) continue;

			const htmlPath = `${basePath}/${htmlFilename}`;
			const mdPath = `${basePath}/${filename(htmlFilename)}.md`;

			// if (htmlFilename !== 'multiline_inner_text.html') continue;

			const html = await shim.fsDriver().readFile(htmlPath);
			let expectedMd = await shim.fsDriver().readFile(mdPath);

			let actualMd = await enexXmlToMd(`<div>${html}</div>`, []);

			if (os.EOL === '\r\n') {
				expectedMd = expectedMd.replace(/\r\n/g, '\n');
				actualMd = actualMd.replace(/\r\n/g, '\n');
			}

			if (actualMd !== expectedMd) {
				console.info('');
				console.info(`Error converting file: ${htmlFilename}`);
				console.info('--------------------------------- Got:');
				console.info(actualMd.split('\n'));
				console.info('--------------------------------- Expected:');
				console.info(expectedMd.split('\n'));
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
