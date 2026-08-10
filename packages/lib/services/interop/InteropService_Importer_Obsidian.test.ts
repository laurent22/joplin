import * as fs from 'fs-extra';
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

	it('should import plain note', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = [
			'Hello.',
			'',
			'## What you should expect',
			'',
			'Note title: plain. Body stays.',
		].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/plain.md`, sourceBody);

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('plain');

		expect(note.title).toBe('plain');
		expect(note.body).toBe(sourceBody);
	});

	it('should use YAML title and remove YAML', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/title.md`, [
			'---',
			'title: New title',
			'---',
			'',
			'Hello.',
		].join('\n'));

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('New title');

		expect(note.title).toBe('New title');
		expect(note.body).toBe('Hello.');
	});

	it('should import YAML tags and remove YAML', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/yaml.md`, [
			'---',
			'tags:',
			'  - work',
			'  - home',
			'---',
			'',
			'Hello.',
			'',
			'## What you should expect',
			'',
			'Tags: work, home. YAML removed.',
		].join('\n'));

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('yaml');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title).sort();

		expect(note.body).toBe([
			'Hello.',
			'',
			'## What you should expect',
			'',
			'Tags: work, home. YAML removed.',
		].join('\n'));
		expect(tags).toEqual(['home', 'work']);
	});

	it('should import inline tag and keep text', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/inline.md`, 'Hello #work.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('inline');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);

		expect(note.body).toBe('Hello #work.');
		expect(tags).toEqual(['work']);
	});

	it('should merge tags ignoring letter case', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const caseSourceBody = [
			'#Work #work #WORK',
			'',
			'## What you should expect',
			'',
			'One tag: Work. Text stays.',
		].join('\n');
		const bothSourceBody = [
			'---',
			'tags:',
			'  - Work',
			'---',
			'',
			'#work #home',
			'',
			'## What you should expect',
			'',
			'Tags: Work, home. No duplicate. Text stays.',
		].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/case.md`, caseSourceBody);
		await fs.writeFile(`${vaultPath}/both.md`, bothSourceBody);

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const caseNote = await Note.loadByTitle('case');
		const caseNoteTags = (await Tag.tagsByNoteId(caseNote.id)).map(tag => tag.title);
		const bothNote = await Note.loadByTitle('both');
		const bothNoteTags = (await Tag.tagsByNoteId(bothNote.id)).map(tag => tag.title).sort();

		expect(caseNote.body).toBe(caseSourceBody);
		expect(caseNoteTags).toEqual(['Work']);
		expect(bothNote.body).toBe([
			'#work #home',
			'',
			'## What you should expect',
			'',
			'Tags: Work, home. No duplicate. Text stays.',
		].join('\n'));
		expect(bothNoteTags).toEqual(['Work', 'home']);
	});

	it('should handle tags containing numbers', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/number.md`, '#work2');
		await fs.writeFile(`${vaultPath}/number-only.md`, '#1984');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const numberNote = await Note.loadByTitle('number');
		const numberNoteTags = (await Tag.tagsByNoteId(numberNote.id)).map(tag => tag.title);
		const numberOnlyNote = await Note.loadByTitle('number-only');
		const numberOnlyNoteTags = (await Tag.tagsByNoteId(numberOnlyNote.id)).map(tag => tag.title);

		expect(numberNote.body).toBe('#work2');
		expect(numberNoteTags).toEqual(['work2']);
		expect(numberOnlyNote.body).toBe('#1984');
		expect(numberOnlyNoteTags).toEqual([]);
	});

	it('should import tag containing underscore', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = [
			'#to_read',
			'',
			'## What you should expect',
			'',
			'One tag: to_read.',
		].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/underscore.md`, sourceBody);

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('underscore');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);

		expect(note.body).toBe(sourceBody);
		expect(tags).toEqual(['to_read']);
	});

	it('should import tag containing hyphen', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = [
			'#to-read',
			'',
			'## What you should expect',
			'',
			'One tag: to-read.',
		].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/hyphen.md`, sourceBody);

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('hyphen');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);

		expect(note.body).toBe(sourceBody);
		expect(tags).toEqual(['to-read']);
	});

	// Obsidian treats `inbox/to-read` as one nested tag. Joplin stores flat tags:
	// Its `tags` table has no hierarchy, and Tag.save allows `/` in tag titles.
	// Keep the full tag text as one Joplin tag.
	it('should import nested tag as one flat tag', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = [
			'#inbox/to-read',
			'',
			'## What you should expect',
			'',
			'One tag: inbox/to-read.',
		].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/nested.md`, sourceBody);

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('nested');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);

		expect(note.body).toBe(sourceBody);
		expect(tags).toEqual(['inbox/to-read']);
	});

	it('should import emoji tag', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/emoji.md`, '#📚');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('emoji');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);

		expect(note.body).toBe('#📚');
		expect(tags).toEqual(['📚']);
	});

	it('should import Unicode tag', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/unicode-tag.md`, '#café');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('unicode-tag');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);

		expect(note.body).toBe('#café');
		expect(tags).toEqual(['café']);
	});

	it('should keep web link', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/web.md`, '[Joplin](https://joplinapp.org)');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('web');

		expect(note.body).toBe('[Joplin](https://joplinapp.org)');
	});

	it('should import Markdown link', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/md-link.md`, [
			'[Note](Note.md)',
			'',
			'## What you should expect',
			'',
			'With Note.md: working Joplin link.',
		].join('\n'));
		await fs.writeFile(`${vaultPath}/Note.md`, 'Target note.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('md-link');
		const targetNote = await Note.loadByTitle('Note');

		expect(note.body).toBe([
			`[Note](:/${targetNote.id})`,
			'',
			'## What you should expect',
			'',
			'With Note.md: working Joplin link.',
		].join('\n'));
	});

	it('should resolve a unique Markdown link target in another folder', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/utils`);
		await fs.writeFile(`${vaultPath}/md-link.md`, '[MD target](md-link-target.md)');
		await fs.writeFile(`${vaultPath}/utils/md-link-target.md`, 'Target note.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('md-link');
		const targetNote = await Note.loadByTitle('md-link-target');

		expect(sourceNote.body).toBe(`[MD target](:/${targetNote.id})`);
	});

	it('should import linked attachment', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/attachment.md`, '[Guide](guide.pdf)');
		await fs.writeFile(`${vaultPath}/guide.pdf`, 'Guide content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('attachment');
		const resourceIds = await Note.linkedResourceIds(note.body);
		const resource = await Resource.load(resourceIds[0]);

		expect(resourceIds).toHaveLength(1);
		expect(note.body).toBe(`[Guide](:/${resource.id})`);
		expect(resource.title).toBe('guide.pdf');
	});

	it('should keep shown text in wikilink', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/wiki-label.md`, [
			'[[Note|Open]]',
			'',
			'## What you should expect',
			'',
			'With Note.md: Joplin link shown as Open.',
		].join('\n'));
		await fs.writeFile(`${vaultPath}/Note.md`, 'Target note.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('wiki-label');
		const targetNote = await Note.loadByTitle('Note');

		expect(note.body).toBe([
			`[Open](:/${targetNote.id})`,
			'',
			'## What you should expect',
			'',
			'With Note.md: Joplin link shown as Open.',
		].join('\n'));
	});

	it('should import folder-path wikilink', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/Work`);
		await fs.writeFile(`${vaultPath}/wiki-path.md`, [
			'[[Work/Note]]',
			'',
			'## What you should expect',
			'',
			'With Work/Note.md: Joplin link to Note.',
		].join('\n'));
		await fs.writeFile(`${vaultPath}/Work/Note.md`, 'Target note.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('wiki-path');
		const targetNote = await Note.loadByTitle('Note');

		expect(note.body).toBe([
			`[Work/Note](:/${targetNote.id})`,
			'',
			'## What you should expect',
			'',
			'With Work/Note.md: Joplin link to Note.',
		].join('\n'));
	});

	it('should import wikilink embed', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = [
			'![[photo.png]]',
			'',
			'## What you should expect',
			'',
			'With photo.png: working Joplin image.',
		].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/embed.md`, sourceBody);
		await fs.writeFile(`${vaultPath}/photo.png`, 'Photo content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('embed');
		const resourceIds = await Note.linkedResourceIds(note.body);

		expect(resourceIds).toHaveLength(1);
		const resource = await Resource.load(resourceIds[0]);
		expect(note.body).toBe([
			`![photo.png](:/${resource.id})`,
			'',
			'## What you should expect',
			'',
			'With photo.png: working Joplin image.',
		].join('\n'));
		expect(resource.title).toBe('photo.png');
	});

	it('should keep unsupported heading wikilink', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/heading.md`, '[[Note#Part]]');
		await fs.writeFile(`${vaultPath}/Note.md`, '# Part');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('heading');

		expect(note.body).toBe('[[Note#Part]]');
	});
});
