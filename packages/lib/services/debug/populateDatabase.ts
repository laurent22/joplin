const Folder = require('../../models/Folder');
const Note = require('../../models/Note');
const Tag = require('../../models/Tag');

function randomIndex(array: any[]): number {
	return Math.round(Math.random() * (array.length - 1));
}

function randomIndexes(arrayLength: number, count: number): number[] {
	const arr = [];
	while (arr.length < count) {
		const r = Math.floor(Math.random() * arrayLength);
		if (arr.indexOf(r) === -1) arr.push(r);
	}
	return arr;
}

function randomElements(array: any[], count: number): any[] {
	const indexes = randomIndexes(array.length, count);
	const output = [];
	for (const index of indexes) {
		output.push(array[index]);
	}
	return output;
}

// Use the constants below to define how many folders, notes and tags
// should be created.
export default async function populateDatabase(db: any) {
	await db.clearForTesting();

	const folderCount = 200;
	const noteCount = 1000;
	const tagCount = 5000;
	const tagsPerNote = 10;

	const createdFolderIds: string[] = [];
	const createdNoteIds: string[] = [];
	const createdTagIds: string[] = [];

	for (let i = 0; i < folderCount; i++) {
		const folder: any = {
			title: `folder${i}`,
		};

		const isRoot = Math.random() <= 0.1 || i === 0;

		if (!isRoot) {
			const parentIndex = randomIndex(createdFolderIds);
			folder.parent_id = createdFolderIds[parentIndex];
		}

		const savedFolder = await Folder.save(folder);
		createdFolderIds.push(savedFolder.id);

		console.info(`Folders: ${i} / ${folderCount}`);
	}

	let tagBatch = [];
	for (let i = 0; i < tagCount; i++) {
		tagBatch.push(Tag.save({ title: `tag${i}` }, { dispatchUpdateAction: false }).then((savedTag: any) => {
			createdTagIds.push(savedTag.id);
			console.info(`Tags: ${i} / ${tagCount}`);
		}));

		if (tagBatch.length > 1000) {
			await Promise.all(tagBatch);
			tagBatch = [];
		}
	}

	if (tagBatch.length) {
		await Promise.all(tagBatch);
		tagBatch = [];
	}

	let noteBatch = [];
	for (let i = 0; i < noteCount; i++) {
		const note: any = { title: `note${i}`, body: `This is note num. ${i}` };
		const parentIndex = randomIndex(createdFolderIds);
		note.parent_id = createdFolderIds[parentIndex];

		noteBatch.push(Note.save(note, { dispatchUpdateAction: false }).then((savedNote: any) => {
			createdNoteIds.push(savedNote.id);
			console.info(`Notes: ${i} / ${noteCount}`);
		}));

		if (noteBatch.length > 1000) {
			await Promise.all(noteBatch);
			noteBatch = [];
		}
	}

	if (noteBatch.length) {
		await Promise.all(noteBatch);
		noteBatch = [];
	}

	let noteTagBatch = [];
	for (const noteId of createdNoteIds) {
		const tagIds = randomElements(createdTagIds, tagsPerNote);
		noteTagBatch.push(Tag.setNoteTagsByIds(noteId, tagIds));

		if (noteTagBatch.length > 1000) {
			await Promise.all(noteTagBatch);
			noteTagBatch = [];
		}
	}

	if (noteTagBatch.length) {
		await Promise.all(noteTagBatch);
		noteTagBatch = [];
	}
}
