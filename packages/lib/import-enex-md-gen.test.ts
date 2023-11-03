import { NoteEntity, ResourceEntity, TagEntity } from './services/database/types';
import shim from './shim';

import { readFile, stat } from 'fs/promises';
const os = require('os');
const { filename } = require('./path-utils');
import { setupDatabaseAndSynchronizer, switchClient, expectNotThrow, supportDir, expectThrow } from './testing/test-utils';
const { enexXmlToMd } = require('./import-enex-md-gen.js');
import importEnex from './import-enex';
import Note from './models/Note';
import Tag from './models/Tag';
import Resource from './models/Resource';

const enexSampleBaseDir = `${supportDir}/../enex_to_md`;

const importEnexFile = async (filename: string) => {
	const filePath = `${enexSampleBaseDir}/${filename}`;
	await importEnex('', filePath);
};

const readExpectedFile = async (filename: string) => {
	const filePath = `${enexSampleBaseDir}/${filename}`;
	return readFile(filePath, 'utf8');
};

describe('import-enex-md-gen', () => {

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

				// eslint-disable-next-line no-console
				console.info(result.join('\n'));

				expect(false).toBe(true);
				// return;
			} else {
				expect(true).toBe(true);
			}
		}
	});

	it('should import ENEX metadata', async () => {
		await importEnexFile('sample-enex.xml');

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
		const s = await stat(Resource.fullPath(resource));
		expect(s.size).toBe(277);
	});

	it('should handle invalid dates', async () => {
		await importEnexFile('invalid_date.enex');
		const note: NoteEntity = (await Note.all())[0];
		expect(note.created_time).toBe(1521822724000); // 20180323T163204Z
		expect(note.updated_time).toBe(1521822724000); // Because this date was invalid, it is set to the created time instead
	});

	it('should handle empty resources', async () => {
		await expectNotThrow(() => importEnexFile('empty_resource.enex'));
		const all = await Resource.all();
		expect(all.length).toBe(1);
		expect(all[0].size).toBe(0);
	});

	it('should handle tasks', async () => {
		await importEnexFile('tasks.enex');
		const expectedMd = await shim.fsDriver().readFile(`${enexSampleBaseDir}/tasks.md`);
		const note: NoteEntity = (await Note.all())[0];
		expect(note.body).toEqual(expectedMd);
	});

	it('should handle empty note content', async () => {
		await importEnexFile('empty_content.enex');
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
		await importEnexFile('WithInvalidMime.enex');
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

	it('should throw an error and stop if the outer XML is invalid', async () => {
		await expectThrow(async () => importEnexFile('invalid_html.enex'));
	});

	it('should import images with sizes', async () => {
		await importEnexFile('images_with_and_without_size.enex');
		let expected = await readExpectedFile('images_with_and_without_size.md');

		const note: NoteEntity = (await Note.all())[0];

		const all: ResourceEntity[] = await Resource.all();

		expect(all.length).toBe(2);

		const svgResource = all.find(r => r.mime === 'image/svg+xml');
		const pngResource = all.find(r => r.mime === 'image/png');

		expected = expected.replace(/RESOURCE_ID_1/, pngResource.id);
		expected = expected.replace(/RESOURCE_ID_2/, svgResource.id);

		expect(note.body).toBe(expected);
		const filePath = `${enexSampleBaseDir}/invalid_html.enex`;
		await expectThrow(async () => importEnex('', filePath));
	});

	it('should set resource extension correctly', async () => {
		// Handle case where the resource has a certain extension, eg. "mscz"
		// and a mime type that doesn't really match (application/zip). In that
		// case we want to make sure that the file is not converted to a .zip
		// file. Fixes https://discourse.joplinapp.org/t/import-issue-evernote-enex-containing-musescore-file-mscz/31394/1
		await importEnexFile('invalid_resource_mime_type.enex');
		const resource: ResourceEntity = (await Resource.all())[0];
		expect(resource.file_extension).toBe('mscz');
		expect(resource.mime).toBe('application/zip');
		expect(Resource.fullPath(resource).endsWith('.mscz')).toBe(true);
	});

	it('should sanitize resource filenames with slashes', async () => {
		await importEnexFile('resource_filename_with_slashes.enex');
		const resource: ResourceEntity = (await Resource.all())[0];
		expect(resource.filename).toBe('house_500.jpg.png');
		expect(resource.file_extension).toBe('png');

		// However we keep the title as it is
		expect(resource.title).toBe('app_images/resizable/961b875f-24ac-402f-9b76-37e2d4f03a6c/house_500.jpg.png');
	});

});
