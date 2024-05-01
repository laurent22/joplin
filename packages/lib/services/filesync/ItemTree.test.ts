import { ModelType } from '../../BaseModel';
import { FolderEntity } from '../database/types';
import ItemTree, { noOpActionListeners } from './ItemTree';
const { ALL_NOTES_FILTER_ID } = require('../../reserved-ids.js');


const baseItem: FolderEntity = {
	id: ALL_NOTES_FILTER_ID,
	title: '',
	type_: ModelType.Folder,
};

describe('ItemTree', () => {
	test('should ensure that items added to a parent have unique titles', async () => {
		const tree = new ItemTree(baseItem);
		await tree.addItemTo('', { title: 'Test', id: '12345678901234567890123456789012', type_: ModelType.Note }, noOpActionListeners);
		await tree.addItemTo('', { title: 'Test', id: '12345678901234567890123456789013', type_: ModelType.Note }, noOpActionListeners);
		await tree.addItemTo('', { title: 'Test', id: '12345678901234567890123456789014', type_: ModelType.Folder }, noOpActionListeners);
		await tree.addItemTo('', { title: 'Test', id: '12345678901234567890123456789015', type_: ModelType.Folder }, noOpActionListeners);
		await tree.addItemTo('Test', { title: 'Note', id: '12345678901234567890123456789016', type_: ModelType.Note }, noOpActionListeners);
		expect([...tree.items()]).toMatchObject([
			['.', baseItem],
			['Test.md', { title: 'Test', id: '12345678901234567890123456789012' }],
			['Test (1).md', { title: 'Test', id: '12345678901234567890123456789013' }],
			['Test', { title: 'Test', id: '12345678901234567890123456789014' }],
			['Test (1)', { title: 'Test', id: '12345678901234567890123456789015' }],
			['Test/Note.md', { title: 'Note', id: '12345678901234567890123456789016' }],
		]);
		tree.checkRep_();
	});

	test('should support moving items from one path to another', async () => {
		const tree = new ItemTree(baseItem);
		await tree.addItemTo('', { title: 'Note 1', id: '12345678901234567890123456789012', type_: ModelType.Note }, noOpActionListeners);
		await tree.addItemTo('', { title: 'Note 2', id: '22345678901234567890123456789012', type_: ModelType.Note }, noOpActionListeners);
		await tree.addItemTo('', { title: 'Folder 1', id: '32345678901234567890123456789012', type_: ModelType.Folder }, noOpActionListeners);
		await tree.addItemTo('', { title: 'Folder 2', id: '42345678901234567890123456789012', type_: ModelType.Folder }, noOpActionListeners);
		await tree.addItemTo('Folder 2', { title: 'Folder 3', id: '52345678901234567890123456789012', type_: ModelType.Folder }, noOpActionListeners);
		expect([...tree.items()]).toMatchObject([
			['.', baseItem],
			['Note 1.md', { title: 'Note 1', id: '12345678901234567890123456789012' }],
			['Note 2.md', { title: 'Note 2', id: '22345678901234567890123456789012' }],
			['Folder 1', { title: 'Folder 1', id: '32345678901234567890123456789012' }],
			['Folder 2', { title: 'Folder 2', id: '42345678901234567890123456789012' }],
			['Folder 2/Folder 3', { title: 'Folder 3', id: '52345678901234567890123456789012' }],
		]);
		tree.checkRep_();
		await tree.move('Note 1.md', 'Folder 1', noOpActionListeners);
		expect([...tree.items()]).toMatchObject([
			['.', baseItem],
			['Note 2.md', { title: 'Note 2', id: '22345678901234567890123456789012' }],
			['Folder 1', { title: 'Folder 1', id: '32345678901234567890123456789012' }],
			['Folder 2', { title: 'Folder 2', id: '42345678901234567890123456789012' }],
			['Folder 2/Folder 3', { title: 'Folder 3', id: '52345678901234567890123456789012' }],
			['Folder 1/Note 1.md', { title: 'Note 1', id: '12345678901234567890123456789012' }],
		]);
		tree.checkRep_();
		await tree.move('Note 2.md', 'Folder 2/Folder 3/foo.md', noOpActionListeners);
		expect([...tree.items()]).toMatchObject([
			['.', baseItem],
			['Folder 1', { title: 'Folder 1', id: '32345678901234567890123456789012' }],
			['Folder 2', { title: 'Folder 2', id: '42345678901234567890123456789012' }],
			['Folder 2/Folder 3', { title: 'Folder 3', id: '52345678901234567890123456789012' }],
			['Folder 1/Note 1.md', { title: 'Note 1', id: '12345678901234567890123456789012' }],
			['Folder 2/Folder 3/foo.md', { title: 'Note 2', id: '22345678901234567890123456789012' }],
		]);
		tree.checkRep_();
	});

	test('should not support moving an item into a subfolder of a note', async () => {
		const tree = new ItemTree(baseItem);
		await tree.addItemTo('', { title: 'Test 1', id: '12345678901234567890123456789012', type_: ModelType.Note }, noOpActionListeners);
		await tree.addItemTo('', { title: 'Test 2', id: '22345678901234567890123456789012', type_: ModelType.Note }, noOpActionListeners);
		expect(() => tree.move('Test 1.md', 'Test 2.md', noOpActionListeners)).toThrow();
		tree.checkRep_();
	});
});
