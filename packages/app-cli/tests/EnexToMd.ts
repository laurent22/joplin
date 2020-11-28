import { NoteEntity, ResourceEntity, TagEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';

const fs = require('fs-extra');
const os = require('os');
const { filename } = require('@joplin/lib/path-utils');
const { setupDatabaseAndSynchronizer, switchClient } = require('./test-utils.js');
const { enexXmlToMd } = require('@joplin/lib/import-enex-md-gen.js');
const { importEnex } = require('@joplin/lib/import-enex');
const Note = require('@joplin/lib/models/Note');
const Tag = require('@joplin/lib/models/Tag');
const Resource = require('@joplin/lib/models/Resource');

const enexSampleBaseDir = `${__dirname}/enex_to_md`;

describe('EnexToMd', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should convert ENEX content to Markdown', async () => {
		const files = await shim.fsDriver().readDirStats(enexSampleBaseDir);

		for (let i = 0; i < files.length; i++) {
			const htmlFilename = files[i].path;
			if (htmlFilename.indexOf('.html') < 0) continue;

			const htmlPath = `${enexSampleBaseDir}/${htmlFilename}`;
			const mdPath = `${enexSampleBaseDir}/${filename(htmlFilename)}.md`;

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
	});

	it('should import ENEX metadata', async () => {
		const filePath = `${enexSampleBaseDir}/sample-enex.xml`;
		await importEnex('', filePath);

		const note: NoteEntity = (await Note.all())[0];
		expect(note.title).toBe('Test Note for Export');
		expect(note.body).toBe([
			'    Hello, World.',
			'',
			'![snapshot-DAE9FC15-88E3-46CF-B744-DA9B1B56EB57.jpg](:/3d0f4d01abc02cf8c4dc1c796df8c4b2)',
		].join('\n'));
		expect(note.created_time).toBe(1375217524000);
		expect(note.updated_time).toBe(1376560800000);
		expect(note.latitude).toBe('33.88394692');
		expect(note.longitude).toBe('-117.91913551');
		expect(note.altitude).toBe('96.0000');
		expect(note.author).toBe('Brett Kelly');

		const tag: TagEntity = (await Tag.tagsByNoteId(note.id))[0];
		expect(tag.title).toBe('fake-tag');

		const resource: ResourceEntity = (await Resource.all())[0];
		expect(resource.id).toBe('3d0f4d01abc02cf8c4dc1c796df8c4b2');
		const stat = await fs.stat(Resource.fullPath(resource));
		expect(stat.size).toBe(277);
	});

	it('should handle invalid dates', async () => {
		const filePath = `${enexSampleBaseDir}/invalid_date.enex`;
		await importEnex('', filePath);
		const note: NoteEntity = (await Note.all())[0];
		expect(note.created_time).toBe(1521822724000); // 20180323T163204Z
		expect(note.updated_time).toBe(1521822724000); // Because this date was invalid, it is set to the created time instead
	});

});
