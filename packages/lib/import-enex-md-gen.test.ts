import { NoteEntity, ResourceEntity, TagEntity } from './services/database/types';
import shim from './shim';

const fs = require('fs-extra');
const os = require('os');
const { filename } = require('./path-utils');
import { setupDatabaseAndSynchronizer, switchClient, expectNotThrow, supportDir } from './testing/test-utils';
const { enexXmlToMd } = require('./import-enex-md-gen.js');
import importEnex from './import-enex';
import Note from './models/Note';
import Tag from './models/Tag';
import Resource from './models/Resource';

const enexSampleBaseDir = `${supportDir}/../enex_to_md`;

describe('import-enex-md-gen', function() {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should convert ENEX content to Markdown', async () => {
		const files = await shim.fsDriver().readDirStats(enexSampleBaseDir);

		for (let i = 0; i < files.length; i++) {
			const htmlFilename = files[i].path;
			if (htmlFilename.indexOf('.html') < 0) continue;

			const htmlPath = `${enexSampleBaseDir}/${htmlFilename}`;
			const mdPath = `${enexSampleBaseDir}/${filename(htmlFilename)}.md`;

			// if (htmlFilename !== 'highlight.html') continue;

			const html = await shim.fsDriver().readFile(htmlPath);
			let expectedMd = await shim.fsDriver().readFile(mdPath);

			let actualMd = await enexXmlToMd(`<div>${html}</div>`, []);

			if (os.EOL === '\r\n') {
				expectedMd = expectedMd.replace(/\r\n/g, '\n');
				actualMd = actualMd.replace(/\r\n/g, '\n');
			}

			if (actualMd !== expectedMd) {
				const result = [];

				result.push('');
				result.push(`Error converting file: ${htmlFilename}`);
				result.push('--------------------------------- Got:');
				result.push(actualMd.split('\n').map((l: string) => `"${l}"`).join('\n'));
				result.push('--------------------------------- Expected:');
				result.push(expectedMd.split('\n').map((l: string) => `"${l}"`).join('\n'));
				result.push('--------------------------------------------');
				result.push('');

				console.info(result.join('\n'));

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

	it('should handle empty resources', async () => {
		const filePath = `${enexSampleBaseDir}/empty_resource.enex`;
		await expectNotThrow(() => importEnex('', filePath));
		const all = await Resource.all();
		expect(all.length).toBe(1);
		expect(all[0].size).toBe(0);
	});

	it('should handle empty note content', async () => {
		const filePath = `${enexSampleBaseDir}/empty_content.enex`;
		await expectNotThrow(() => importEnex('', filePath));
		const all = await Note.all();
		expect(all.length).toBe(1);
		expect(all[0].title).toBe('China and the case for stimulus.');
		expect(all[0].body).toBe('');
	});

	it('should handle invalid mime types', async () => {
		// This is to handle the case where a resource has an invalid mime type,
		// but that type can be determined from the filename. For example, in
		// this thread, the ENEX file contains a "file.zip" file with a mime
		// type "application/octet-stream", which can later cause problems to
		// open the file.
		// https://discourse.joplinapp.org/t/importing-a-note-with-a-zip-file/12123?u=laurent
		const filePath = `${enexSampleBaseDir}/WithInvalidMime.enex`;
		await importEnex('', filePath);
		const all = await Resource.all();
		expect(all.length).toBe(1);
		expect(all[0].mime).toBe('application/zip');
	});

	it('should keep importing notes when one of them is corrupted', async () => {
		const filePath = `${enexSampleBaseDir}/ImportTestCorrupt.enex`;
		const errors: any[] = [];
		await importEnex('', filePath, {
			onError: (error: any) => errors.push(error),
		});
		const notes = await Note.all();
		expect(notes.length).toBe(2);

		// Check that an error was recorded and that it includes the title
		// of the note, so that it can be found back by the user
		expect(errors.length).toBe(1);
		expect(errors[0].message.includes('Note 2')).toBe(true);
	});

});
