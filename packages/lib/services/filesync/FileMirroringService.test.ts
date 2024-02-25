import Folder from "../../models/Folder";
import Note from "../../models/Note";
import { createTempDir, setupDatabaseAndSynchronizer, switchClient } from "../../testing/test-utils";
import FileMirroringService from "./FileMirroringService";

describe('FileMirroringService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should sync with a local dir', async()=> {
		const folder1 = await Folder.save({ title: 'folder1' });
		const folder2 = await Folder.save({ title: 'folder2' });
		const folder3 = await Folder.save({ title: 'folder3', parent_id: folder2.id });
		const note1 = await Note.save({ title: 'note1', parent_id: folder1.id });
		const note2 = await Note.save({ title: 'note2', parent_id: folder1.id });
		const note3 = await Note.save({ title: 'note3', parent_id: folder3.id });

		const tempDir = await createTempDir();
		const service = new FileMirroringService();
		await service.syncDir(tempDir);
	});

	// TODO: test notes with duplicate names
	// TODO: test folder with duplicate names

});