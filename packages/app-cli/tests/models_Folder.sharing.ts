import { setupDatabaseAndSynchronizer, switchClient, createFolderTree } from './test-utils';
import Folder from '@joplin/lib/models/Folder';
import { allNotesFolders } from './test-utils-synchronizer';
import Note from '@joplin/lib/models/Note';
import shim from '@joplin/lib/shim';
import Resource from '@joplin/lib/models/Resource';
import { NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
import NoteResource from '@joplin/lib/models/NoteResource';
import ResourceService from '@joplin/lib/services/ResourceService';

const testImagePath = `${__dirname}/../tests/support/photo.jpg`;

describe('models_Folder.sharing', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		done();
	});

	it('should apply the share ID to all children', (async () => {
		const folder = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
					{
						title: 'folder 2',
						children: [
							{
								title: 'note 3',
							},
						],
					},
				],
			},
		]);

		await Folder.setShareStatus(folder.id, 'abcd1234');

		const allItems = await allNotesFolders();
		for (const item of allItems) {
			expect(item.share_id).toBe('abcd1234');
		}
	}));

	it('should apply the share ID to all sub-folders', (async () => {
		let folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
					{
						title: 'folder 2',
						children: [
							{
								title: 'note 3',
							},
						],
					},
					{
						title: 'folder 3',
						children: [
							{
								title: 'folder 4',
								children: [],
							},
						],
					},
				],
			},
			{
				title: 'folder 5',
				children: [],
			},
		]);

		await Folder.save({ id: folder1.id, share_id: 'abcd1234' });

		await Folder.updateFolderShareIds();

		folder1 = await Folder.loadByTitle('folder 1');
		const folder2 = await Folder.loadByTitle('folder 2');
		const folder3 = await Folder.loadByTitle('folder 3');
		const folder4 = await Folder.loadByTitle('folder 4');
		const folder5 = await Folder.loadByTitle('folder 5');

		expect(folder1.share_id).toBe('abcd1234');
		expect(folder2.share_id).toBe('abcd1234');
		expect(folder3.share_id).toBe('abcd1234');
		expect(folder4.share_id).toBe('abcd1234');
		expect(folder5.share_id).toBe('');
	}));

	it('should remove the share ID if a folder is moved out', (async () => {
		let folder1 = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'folder 2',
						children: [],
					},
				],
			},
			{
				title: 'folder 3',
				children: [],
			},
		]);

		await Folder.save({ id: folder1.id, share_id: 'abcd1234' });

		await Folder.updateFolderShareIds();

		folder1 = await Folder.loadByTitle('folder 1');
		let folder2 = await Folder.loadByTitle('folder 2');
		const folder3 = await Folder.loadByTitle('folder 3');

		expect(folder1.share_id).toBe('abcd1234');
		expect(folder2.share_id).toBe('abcd1234');

		await Folder.save({ id: folder2.id, parent_id: folder3.id });

		await Folder.updateFolderShareIds();

		folder2 = await Folder.loadByTitle('folder 2');
		expect(folder2.share_id).toBe('');
	}));


	it('should apply the note share ID to its resources', async () => {
		const resourceService = new ResourceService();

		const folder = await createFolderTree('', [
			{
				title: 'folder 1',
				children: [
					{
						title: 'note 1',
					},
					{
						title: 'note 2',
					},
				],
			},
		]);

		await Folder.setShareStatus(folder.id, 'abcd1234');

		const note1: NoteEntity = await Note.loadByTitle('note 1');
		await shim.attachFileToNote(note1, testImagePath);

		// We need to index the resources to populate the note_resources table
		await resourceService.indexNoteResources();

		const resourceId: string = (await Resource.all())[0].id;

		{
			const resource: ResourceEntity = await Resource.load(resourceId);
			expect(resource.share_id).toBe('');
		}

		await NoteResource.updateResourceShareIds();

		{
			const resource: ResourceEntity = await Resource.load(resourceId);
			expect(resource.share_id).toBe(note1.share_id);
		}

		await Note.save({ id: note1.id, share_id: '' });
		await resourceService.indexNoteResources();

		await NoteResource.updateResourceShareIds();

		{
			const resource: ResourceEntity = await Resource.load(resourceId);
			expect(resource.share_id).toBe('');
		}
	});

	// it('should add the share ID when an item is moved to a shared folder', async () => {
	// 	const folder = await Folder.save({ title: 'shared folder' });
	// 	await Folder.setShareStatus(folder.id, 'abcd');

	// 	const note = await Note.save({ parent_id: folder.id });

	// });

});
