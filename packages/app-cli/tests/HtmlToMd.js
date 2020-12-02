/* eslint-disable no-unused-vars */


const os = require('os');
const time = require('@joplin/lib/time').default;
const { filename } = require('@joplin/lib/path-utils');
const { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('./test-utils.js');
const Folder = require('@joplin/lib/models/Folder.js');
const Note = require('@joplin/lib/models/Note.js');
const BaseModel = require('@joplin/lib/BaseModel').default;
const shim = require('@joplin/lib/shim').default;
const HtmlToMd = require('@joplin/lib/HtmlToMd');
const { enexXmlToMd } = require('@joplin/lib/import-enex-md-gen.js');

describe('HtmlToMd', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should convert from Html to Markdown', (async () => {
		const basePath = `${__dirname}/html_to_md`;
		const files = await shim.fsDriver().readDirStats(basePath);
		const htmlToMd = new HtmlToMd();

		for (let i = 0; i < files.length; i++) {
			const htmlFilename = files[i].path;
			if (htmlFilename.indexOf('.html') < 0) continue;

			const htmlPath = `${basePath}/${htmlFilename}`;
			const mdPath = `${basePath}/${filename(htmlFilename)}.md`;

			// if (htmlFilename !== 'code_3.html') continue;

			// if (htmlFilename.indexOf('image_preserve_size') !== 0) continue;

			const htmlToMdOptions = {};

			if (htmlFilename === 'anchor_local.html') {
				// Normally the list of anchor names in the document are retrieved from the HTML code
				// This is straightforward when the document is still in DOM format, as with the clipper,
				// but otherwise it would need to be somehow parsed out from the HTML. Here we just
				// hard code the anchors that we know are in the file.
				htmlToMdOptions.anchorNames = ['first', 'second', 'fourth'];
			}

			if (htmlFilename.indexOf('image_preserve_size') === 0) {
				htmlToMdOptions.preserveImageTagsWithSize = true;
			}

			const html = await shim.fsDriver().readFile(htmlPath);
			let expectedMd = await shim.fsDriver().readFile(mdPath);

			let actualMd = await htmlToMd.parse(`<div>${html}</div>`, htmlToMdOptions);

			if (os.EOL === '\r\n') {
				expectedMd = expectedMd.replace(/\r\n/g, '\n');
				actualMd = actualMd.replace(/\r\n/g, '\n');
			}

			if (actualMd !== expectedMd) {
				const result = [];

				result.push('');
				result.push(`Error converting file: ${htmlFilename}`);
				result.push('--------------------------------- Got:');
				result.push(actualMd.split('\n').map(l => `"${l}"`).join('\n'));
				result.push('--------------------------------- Expected:');
				result.push(expectedMd.split('\n').map(l => `"${l}"`).join('\n'));
				result.push('--------------------------------------------');
				result.push('');

				console.info(result.join('\n'));


				// console.info('');
				// console.info(`Error converting file: ${htmlFilename}`);
				// console.info('--------------------------------- Got:');
				// console.info(actualMd);
				// console.info('--------------------------------- Raw:');
				// console.info(actualMd.split('\n'));
				// console.info('--------------------------------- Expected:');
				// console.info(expectedMd.split('\n'));
				// console.info('--------------------------------------------');
				// console.info('');

				expect(false).toBe(true);
				// return;
			} else {
				expect(true).toBe(true);
			}
		}
	}));

});
