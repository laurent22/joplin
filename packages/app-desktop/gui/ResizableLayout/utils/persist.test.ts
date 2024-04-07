import { loadLayout, saveLayout } from './persist';
import { LayoutItem, LayoutItemDirection } from './types';
import validateLayout from './validateLayout';

describe('persist', () => {

	test('should save layout and filter out non-user properties', () => {
		const layout: LayoutItem = validateLayout({
			key: 'root',
			width: 100,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
					width: 50,
				},
				{
					key: 'col2',
					direction: LayoutItemDirection.Column,
					children: [
						{ key: 'item1', height: 20 },
						{ key: 'item2' },
					],
				},
				{
					key: 'col3',
				},
			],
		});

		const toSave = saveLayout(layout);

		expect(toSave.key).toBe('root');
		expect(toSave.width).toBeUndefined();
		expect(toSave.height).toBeUndefined();
		expect(toSave.direction).toBeUndefined();
		expect(toSave.children.length).toBe(3);

		expect(toSave.children[1].key).toBe('col2');
		expect(toSave.children[1].direction).toBeUndefined();
	});

	test('should load a layout', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const layout: any = {
			key: 'root',
			children: [
				{
					key: 'col1',
					width: 50,
				},
				{
					key: 'col2',
					children: [
						{ key: 'item1', height: 20 },
						{ key: 'item2' },
					],
				},
				{
					key: 'col3',
				},
			],
		};

		const loaded = loadLayout(layout, null, { width: 100, height: 200 });

		expect(loaded.key).toBe('root');
		expect(loaded.width).toBe(100);
		expect(loaded.height).toBe(200);
		expect(loaded.direction).toBe(LayoutItemDirection.Row);
		expect(loaded.children.length).toBe(3);

		expect(loaded.children[1].key).toBe('col2');
		expect(loaded.children[1].direction).toBe(LayoutItemDirection.Column);
	});

});
