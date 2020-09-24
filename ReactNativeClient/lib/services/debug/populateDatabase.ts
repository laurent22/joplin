const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');

function randomIndex(array:any[]):number {
	return Math.round(Math.random() * (array.length - 1));
}

export default async function populateDatabase(db:any) {
	await db.clearForTesting();

	const folderCount = 2000;
	const noteCount = 20000;

	const createdFolderIds:string[] = [];
	const createdNoteIds:string[] = [];

	for (let i = 0; i < folderCount; i++) {
		const folder:any = {
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

	let noteBatch = [];
	for (let i = 0; i < noteCount; i++) {
		const note:any = { title: `note${i}`, body: `This is note num. ${i}` };
		const parentIndex = randomIndex(createdFolderIds);
		note.parent_id = createdFolderIds[parentIndex];

		noteBatch.push(Note.save(note, { dispatchUpdateAction: false }).then((savedNote:any) => {
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
}
