/* eslint-disable no-unused-vars */



import os from 'os';
import time from '@joplin/lib/time';
import { filename } from '@joplin/lib/path-utils';
import { fileContentEqual, setupDatabase, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } from '@joplin/lib/testing/test-utils.js';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import BaseModel from '@joplin/lib/BaseModel';
import shim from '@joplin/lib/shim';
import HtmlToHtml from '@joplin/renderer/HtmlToHtml';
import { enexXmlToMd } from '@joplin/lib/import-enex-md-gen.js';
describe('HtmlToHtml', () => {

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
				/* eslint-disable no-console */
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
				/* eslint-enable */

				expect(false).toBe(true);
				// return;
			} else {
				expect(true).toBe(true);
			}
		}
	}));

});
