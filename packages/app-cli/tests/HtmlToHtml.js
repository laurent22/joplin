/* eslint-disable no-unused-vars */


const os = require('os');
const time = require('@joplin/lib/time').default;
const { filename } = require('@joplin/lib/path-utils');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('@joplin/lib/testing/test-utils.js');
const Folder = require('@joplin/lib/models/Folder').default;
const Note = require('@joplin/lib/models/Note').default;
const BaseModel = require('@joplin/lib/BaseModel').default;
const shim = require('@joplin/lib/shim').default;
const HtmlToHtml = require('@joplin/renderer/HtmlToHtml').default;
const { enexXmlToMd } = require('@joplin/lib/import-enex-md-gen.js');

describe('HtmlToHtml', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should convert from Html to Html', (async () => {
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
