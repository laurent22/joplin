import { addOptions } from './moveToFolder';

const sampleFolderTree = [{
	title: 'Another Folder',
	children: [
		{ title: 'BSSE' },
		{
			title: 'Inside another folder',
			children: [
				{
					title: 'CS',
				},
			],
		},
	],

},
{
	title: 'Messup',
	children: [
		{ title: 'BSSE' },
		{
			title: 'Inside another folder',
			children: [
				{ title: 'CS' },
			],
		},
	],
},
{
	title: 'Tinkering',
	children: [
		{ title: 'BSSE' },
		{
			title: 'Inner Tinker Folder',
			children: [
				{ title: 'BSSE' },
			],
		},
	],
},
{
	title: 'Messup',
}];

const findDestinationFolder = (folderName: string, folders: any[]) => {
	let startFolders = addOptions(folders, 0);
	startFolders = startFolders.filter(startFolder => startFolder.label.trim().includes(folderName));
	return startFolders;
};


describe('Distinguish notebooks with the same name', () => {

	test('Should return nothing for folders that do not exist.', () => {
		const moveFolderOptions = findDestinationFolder('non_existent', sampleFolderTree);
		expect(moveFolderOptions.length).toBe(0);

	});

	test('Should return full path for embedded folders.', () => {
		const folders = findDestinationFolder('BSSE', sampleFolderTree);
		const expectedLabels = [
			'Another Folder >> BSSE',
			'Messup >> BSSE',
			'Tinkering >> BSSE',
			'Tinkering >> Inner Tinker Folder >> BSSE',
		];

		for (let index = 0; index < folders.length; index++) {
			const label = folders[index].label;
			expect(expectedLabels).toContain(label);
		}

		expect(folders.length).toBe(4);
	});




});

