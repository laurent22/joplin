import * as fs from 'fs-extra';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Resource from '../../models/Resource';
import Tag from '../../models/Tag';
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import InteropService from './InteropService';

describe('InteropService_Importer_Obsidian', () => {
	let tempDir: string;

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		tempDir = await createTempDir();
	});

	afterEach(async () => {
		await fs.remove(tempDir);
	});

	it('should import vault notes and create notebooks from folders', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/Projects`);
		await fs.writeFile(`${vaultPath}/Home.md`, [
			'---',
			'title: Home page',
			'---',
			'',
			'Home body',
		].join('\n'));
		await fs.writeFile(`${vaultPath}/Projects/Work.md`, 'Work body');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const vaultFolder = await Folder.loadByTitleAndParent('My vault', '');
		const projectsFolder = await Folder.loadByTitleAndParent('Projects', vaultFolder.id);
		const homeNote = await Note.loadByTitle('Home page');
		const workNote = await Note.loadByTitle('Work');

		expect(vaultFolder).toBeTruthy();
		expect(projectsFolder).toBeTruthy();
		expect(homeNote.parent_id).toBe(vaultFolder.id);
		expect(homeNote.body).toBe('Home body');
		expect(workNote.parent_id).toBe(projectsFolder.id);
		expect(workNote.body).toBe('Work body');
	});

	it('should keep Markdown links and import linked attachments', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/Projects`);
		await fs.mkdirp(`${vaultPath}/Assets`);
		await fs.writeFile(`${vaultPath}/Home.md`, [
			'Read [Work](Projects/Work.md).',
			'Open [guide](Assets/guide.pdf).',
			'Visit [Joplin](https://joplinapp.org).',
		].join('\n'));
		await fs.writeFile(`${vaultPath}/Projects/Work.md`, 'Work body');
		await fs.writeFile(`${vaultPath}/Assets/guide.pdf`, 'Guide content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const homeNote = await Note.loadByTitle('Home');
		const workNote = await Note.loadByTitle('Work');
		const resourceIds = await Note.linkedResourceIds(homeNote.body);
		const resource = await Resource.load(resourceIds[0]);

		expect(await Note.linkedNoteIds(homeNote.body)).toEqual([workNote.id]);
		expect(homeNote.body).toContain(`[Work](:/${workNote.id})`);
		expect(homeNote.body).toContain(`[guide](:/${resource.id})`);
		expect(homeNote.body).toContain('[Joplin](https://joplinapp.org)');
		expect(resource.title).toBe('guide.pdf');
	});

	it('should join YAML and inline tags without changing note body', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = [
			'---',
			'tags:',
			'  - Project',
			'  - yaml-only',
			'---',
			'',
			'Keep #project #inline #INLINE in body.',
		].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/Tags.md`, sourceBody);

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('Tags');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title).sort();

		expect(note.body).toBe('Keep #project #inline #INLINE in body.');
		expect(tags).toEqual(['Project', 'inline', 'yaml-only']);
	});

	it('should convert basic wikilinks after all notes are imported', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/First.md`, '[[Later]] and [[Later|Shown name]]');
		await fs.writeFile(`${vaultPath}/Later.md`, 'Later body');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const firstNote = await Note.loadByTitle('First');
		const laterNote = await Note.loadByTitle('Later');
		expect(firstNote.body).toBe(`[Later](:/${laterNote.id}) and [Shown name](:/${laterNote.id})`);
	});

	it('should resolve exact paths and keep missing or unclear wikilinks', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/One`);
		await fs.mkdirp(`${vaultPath}/Two`);
		await fs.mkdirp(`${vaultPath}/資料`);
		await fs.writeFile(`${vaultPath}/Source.md`, [
			'[[One/Shared]]',
			'[[Two/Shared.md|Second copy]]',
			'[[資料/文件 with space]]',
			'[[Missing]]',
			'[[Shared]]',
		].join('\n'));
		await fs.writeFile(`${vaultPath}/One/Shared.md`, 'First copy');
		await fs.writeFile(`${vaultPath}/Two/Shared.md`, 'Second copy');
		await fs.writeFile(`${vaultPath}/資料/文件 with space.md`, 'Unicode path');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('Source');
		const vaultFolder = await Folder.loadByTitleAndParent('My vault', '');
		const firstFolder = await Folder.loadByTitleAndParent('One', vaultFolder.id);
		const secondFolder = await Folder.loadByTitleAndParent('Two', vaultFolder.id);
		const importedNotes = await Note.all();
		const firstCopy = importedNotes.find(note => note.title === 'Shared' && note.parent_id === firstFolder.id);
		const secondCopy = importedNotes.find(note => note.title === 'Shared' && note.parent_id === secondFolder.id);
		const unicodeNote = await Note.loadByTitle('文件 with space');
		expect(firstCopy).toBeTruthy();
		expect(secondCopy).toBeTruthy();
		expect(sourceNote.body).toBe([
			`[One/Shared](:/${firstCopy.id})`,
			`[Second copy](:/${secondCopy.id})`,
			`[資料/文件 with space](:/${unicodeNote.id})`,
			'[[Missing]]',
			'[[Shared]]',
		].join('\n'));
	});

	it('should resolve unique path endings when a parent folder is imported', async () => {
		const parentPath = `${tempDir}/Backup`;
		await fs.mkdirp(`${parentPath}/My vault/One`);
		await fs.mkdirp(`${parentPath}/Vault A/Common`);
		await fs.mkdirp(`${parentPath}/Vault B/Common`);
		await fs.writeFile(`${parentPath}/My vault/Source.md`, [
			'[[One/Shared]]',
			'[[Common/Repeated]]',
		].join('\n'));
		await fs.writeFile(`${parentPath}/My vault/One/Shared.md`, 'Unique path');
		await fs.writeFile(`${parentPath}/Vault A/Common/Repeated.md`, 'First repeated path');
		await fs.writeFile(`${parentPath}/Vault B/Common/Repeated.md`, 'Second repeated path');

		await InteropService.instance().import({
			format: 'obsidian',
			path: parentPath,
		});

		const sourceNote = await Note.loadByTitle('Source');
		const sharedNote = await Note.loadByTitle('Shared');
		expect(sourceNote.body).toBe([
			`[One/Shared](:/${sharedNote.id})`,
			'[[Common/Repeated]]',
		].join('\n'));
	});
});
