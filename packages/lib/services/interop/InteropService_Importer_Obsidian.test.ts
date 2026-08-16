import * as fs from 'fs-extra';
import Note from '../../models/Note';
import Resource from '../../models/Resource';
import Tag from '../../models/Tag';
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import InteropService from './InteropService';

// cspell:ignore हिन्दी

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

	it('should keep code examples literal', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const codeExamples = new Map([
			['inline-code', '`example #fake [[Note]]`'],
			['double-backtick-inline-code', '``example ` #fake [[Note]]``'],
			['backtick-code-block', '```text\n#fake\n[[Note]]\n![[photo.png]]\n```'],
			['tilde-code-block', '~~~text\n#fake\n[[Note]]\n![[photo.png]]\n~~~'],
			['nested-code-block', '````md\n```text\n#fake\n[[Note]]\n```\n````'],
			['indented-code-block', '    #fake [[Note]] ![[photo.png]]'],
			['unclosed-code-block', '```text\n#fake\n[[Note]]\n![[photo.png]]'],
		]);
		await fs.mkdirp(vaultPath);
		for (const [title, sourceBody] of codeExamples) {
			await fs.writeFile(`${vaultPath}/${title}.md`, sourceBody);
		}
		await fs.writeFile(`${vaultPath}/Note.md`, 'Target note.');
		await fs.writeFile(`${vaultPath}/photo.png`, 'Photo content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		for (const [title, sourceBody] of codeExamples) {
			const note = await Note.loadByTitle(title);
			const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);

			expect(note.body).toBe(sourceBody);
			expect(tags).toEqual([]);
		}
	});

	test.each([
		['backtick', '```text', '````'],
		['tilde', '~~~text', '~~~~'],
	])('should close %s code fence longer than opening fence', async (_type, openingFence, closingFence) => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = [openingFence, '[[Target]]', closingFence, '[[Target]]'].join('\n');
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/Source.md`, sourceBody);
		await fs.writeFile(`${vaultPath}/Target.md`, 'Target note.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('Source');
		const targetNote = await Note.loadByTitle('Target');

		expect(sourceNote.body).toBe([
			openingFence,
			'[[Target]]',
			closingFence,
			`[Target](:/${targetNote.id})`,
		].join('\n'));
	});

	it('should skip Obsidian config and trash folders', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/.obsidian/plugins/example`);
		await fs.mkdirp(`${vaultPath}/.trash`);
		await fs.writeFile(`${vaultPath}/kept.md`, 'Keep this note.');
		await fs.writeFile(`${vaultPath}/.obsidian/plugins/example/README.md`, 'Plugin documentation.');
		await fs.writeFile(`${vaultPath}/.trash/deleted.md`, 'Deleted note.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const notes = await Note.all();

		expect(notes.map(note => note.title)).toEqual(['kept']);
		expect(notes[0].body).toBe('Keep this note.');
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

	it('should import empty front matter', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/empty.md`, '---\n\n---\n\nHello.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('empty');

		expect(note.body).toBe('Hello.');
	});

	it('should import YAML tags, remove tag YAML, and preserve cssclasses', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/yaml.md`, [
			'---',
			'tags:',
			'  - work',
			'  - home',
			'cssclasses:',
			'  - red-border',
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
			'---',
			'cssclasses:',
			'  - red-border',
			'---',
			'',
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

	it('should import Unicode tags containing combining marks and symbols', async () => {
		const vaultPath = `${tempDir}/My vault`;
		const sourceBody = '#हिन्दी #cafe\u0301 #✓';
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/unicode-tags.md`, sourceBody);

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('unicode-tags');
		const tags = (await Tag.tagsByNoteId(note.id)).map(tag => tag.title);
		const expectedTags = ['हिन्दी', 'café', '✓'];

		expect(note.body).toBe(sourceBody);
		expect(tags).toHaveLength(expectedTags.length);
		expect(tags).toEqual(expect.arrayContaining(expectedTags));
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

	test.each([
		['without fragment', '[Overview](../Overview.md)', ''],
		['with fragment', '[Overview](../Overview.md#Install)', '#install'],
	])('should resolve relative Markdown link %s', async (_case, sourceBody, fragment) => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/Folder`);
		await fs.writeFile(`${vaultPath}/Folder/Current.md`, sourceBody);
		await fs.writeFile(`${vaultPath}/Overview.md`, '# Install');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('Current');
		const targetNote = await Note.loadByTitle('Overview');

		expect(sourceNote.body).toBe(`[Overview](:/${targetNote.id}${fragment})`);
	});

	test.each([
		['without fragment', '[MD target](md-link-target.md)', ''],
		['with fragment', '[MD target](md-link-target.md#Notes)', '#notes'],
	])('should resolve a unique Markdown link target in another folder %s', async (_case, sourceBody, fragment) => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(`${vaultPath}/utils`);
		await fs.writeFile(`${vaultPath}/md-link.md`, sourceBody);
		await fs.writeFile(`${vaultPath}/utils/md-link-target.md`, '# Notes');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('md-link');
		const targetNote = await Note.loadByTitle('md-link-target');

		expect(sourceNote.body).toBe(`[MD target](:/${targetNote.id}${fragment})`);
	});

	it('should import linked attachment', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		// Test normal Markdown link, attachment wikilink, and attachment wikilink with shown text.
		await fs.writeFile(`${vaultPath}/attachment.md`, '[Guide](guide.pdf) [[guide.pdf]] [[guide.pdf|Open guide]]');
		await fs.writeFile(`${vaultPath}/guide.pdf`, 'Guide content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('attachment');
		const resourceIds = await Note.linkedResourceIds(note.body);
		const resource = await Resource.load(resourceIds[0]);

		expect(resourceIds).toHaveLength(1);
		// All three links should point to same imported Joplin resource.
		expect(note.body).toBe(`[Guide](:/${resource.id}) [guide.pdf](:/${resource.id}) [Open guide](:/${resource.id})`);
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

	it('should resolve wikilinks ignoring letter case', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/Source.md`, '[[note]]');
		await fs.writeFile(`${vaultPath}/Note.md`, 'Target note.');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('Source');
		const targetNote = await Note.loadByTitle('Note');

		expect(sourceNote.body).toBe(`[note](:/${targetNote.id})`);
	});

	it('should resolve wikilinks using note title with shown alias', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/Source.md`, '[[Work|Project plan]]');
		await fs.writeFile(`${vaultPath}/Work.md`, [
			'---',
			'aliases:',
			'  - Project plan',
			'---',
			'',
			'Target note.',
		].join('\n'));

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('Source');
		const targetNote = await Note.loadByTitle('Work');

		expect(sourceNote.body).toBe(`[Project plan](:/${targetNote.id})`);
	});

	it('should prefer canonical note title over front matter alias', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/Source.md`, '[[Project plan]]');
		await fs.writeFile(`${vaultPath}/Project plan.md`, 'Canonical note.');
		await fs.writeFile(`${vaultPath}/Work.md`, [
			'---',
			'aliases:',
			'  - Project plan',
			'---',
		].join('\n'));

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const sourceNote = await Note.loadByTitle('Source');
		const canonicalNote = await Note.loadByTitle('Project plan');

		expect(sourceNote.body).toBe(`[Project plan](:/${canonicalNote.id})`);
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

	it('should preserve image embed dimensions', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/embed-size.md`, '![[photo.png|100]]\n![[photo.png|100x200]]');
		await fs.writeFile(`${vaultPath}/photo.png`, 'Photo content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('embed-size');
		const resourceIds = await Note.linkedResourceIds(note.body);

		expect(resourceIds).toHaveLength(1);
		expect(note.body).toBe([
			`<img src=":/${resourceIds[0]}" width="100" alt="photo.png"/>`,
			`<img src=":/${resourceIds[0]}" width="100" height="200" alt="photo.png"/>`,
		].join('\n'));
	});

	it('should preserve image embed caption', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/embed-caption.md`, '![[photo.png|A photo]]');
		await fs.writeFile(`${vaultPath}/photo.png`, 'Photo content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('embed-caption');
		const resourceIds = await Note.linkedResourceIds(note.body);

		expect(resourceIds).toHaveLength(1);
		expect(note.body).toBe(`![A photo](:/${resourceIds[0]})`);
	});

	it('should import non-image embeds as links', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/embed.md`, [
			'![[Document.pdf]]',
			'![[Audio.ogg]]',
			'![[Video.mp4]]',
			'![[Note]]',
		].join('\n'));
		await fs.writeFile(`${vaultPath}/Document.pdf`, 'PDF content');
		await fs.writeFile(`${vaultPath}/Audio.ogg`, 'Audio content');
		await fs.writeFile(`${vaultPath}/Video.mp4`, 'Video content');
		await fs.writeFile(`${vaultPath}/Note.md`, 'Note content');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('embed');
		const targetNote = await Note.loadByTitle('Note');
		const resourceIds = await Note.linkedResourceIds(note.body);
		const resources = await Promise.all(resourceIds.map(resourceId => Resource.load(resourceId)));
		const resourceIdByTitle = new Map(resources.map(resource => [resource.title, resource.id]));

		expect(resources.map(resource => resource.title).sort()).toEqual(['Audio.ogg', 'Document.pdf', 'Video.mp4']);
		expect(note.body).toBe([
			`[Document.pdf](:/${resourceIdByTitle.get('Document.pdf')})`,
			`[Audio.ogg](:/${resourceIdByTitle.get('Audio.ogg')})`,
			`[Video.mp4](:/${resourceIdByTitle.get('Video.mp4')})`,
			`[Note](:/${targetNote.id})`,
		].join('\n'));
		expect(await Note.linkedNoteIds(note.body)).toEqual([targetNote.id]);
	});

	it('should import heading wikilink', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/heading.md`, '[[Note#Part]] [[Missing#Part]]');
		await fs.writeFile(`${vaultPath}/Note.md`, '# Part');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('heading');
		const targetNote = await Note.loadByTitle('Note');

		expect(note.body).toBe(`[Note#Part](:/${targetNote.id}#part) [[Missing#Part]]`);
	});

	it('should import same-note heading wikilink', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/same-heading.md`, '# Part\n\n[[#Part]]');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('same-heading');

		expect(note.body).toBe(`# Part\n\n[#Part](:/${note.id}#part)`);
	});

	it('should import nested heading wikilink', async () => {
		const vaultPath = `${tempDir}/My vault`;
		await fs.mkdirp(vaultPath);
		await fs.writeFile(`${vaultPath}/heading.md`, '[[Note#Parent#Child]]');
		await fs.writeFile(`${vaultPath}/Note.md`, '# Parent\n\n## Child');

		await InteropService.instance().import({
			format: 'obsidian',
			path: vaultPath,
		});

		const note = await Note.loadByTitle('heading');
		const targetNote = await Note.loadByTitle('Note');

		expect(note.body).toBe(`[Note#Parent#Child](:/${targetNote.id}#child)`);
	});
});
