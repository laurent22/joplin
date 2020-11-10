import { LayoutItem, LayoutItemDirection } from './types';
import validateLayout from './validateLayout';
import { moveHorizontal, moveVertical } from './movements';


describe('movements', () => {

	test('should move items horizontally', () => {
		let layout:LayoutItem = {
			key: 'root',
			width: 100,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
				},
				{
					key: 'col2',
				},
				{
					key: 'col3',
				},
			],
		};

		validateLayout(layout);

		expect(() => moveHorizontal(layout, 'col1', -1)).toThrow();

		layout = moveHorizontal(layout, 'col1', 1);

		expect(layout.children[0].key).toBe('col2');
		expect(layout.children[1].key).toBe('col1');
		expect(layout.children[2].key).toBe('col3');

		layout = moveHorizontal(layout, 'col1', 1);

		expect(layout.children[0].key).toBe('col2');
		expect(layout.children[1].key).toBe('col3');
		expect(layout.children[2].key).toBe('col1');

		expect(() => moveHorizontal(layout, 'col1', 1)).toThrow();
	});

	test('moving horizontally: should move items out of their containers', () => {
		let layout:LayoutItem = {
			key: 'root',
			width: 100,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
				},
				{
					key: 'col2',
					direction: LayoutItemDirection.Column,
					children: [
						{
							key: 'row1',
						},
						{
							key: 'row2',
						},
					],
				},
				{
					key: 'col3',
				},
			],
		};

		validateLayout(layout);

		layout = moveHorizontal(layout, 'row1', 1);

		expect(layout.children[0].key).toBe('col1');
		expect(layout.children[1].key).toBe('col2');
		expect(layout.children[2].key).toBe('row1');
		expect(layout.children[3].key).toBe('col3');
		expect(layout.children[1].children.length).toBe(1);

		layout = moveHorizontal(layout, 'row1', -1);

		expect(layout.children[0].key).toBe('col1');
		expect(layout.children[1].key).toBe('col2');
		expect(layout.children[1].children[0].key).toBe('row2');
		expect(layout.children[1].children[1].key).toBe('row1');
		expect(layout.children[2].key).toBe('col3');
	});

	test('should move items vertically', () => {
		let layout:LayoutItem = {
			key: 'root',
			width: 100,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
				},
				{
					key: 'col2',
					direction: LayoutItemDirection.Column,
					children: [
						{ key: 'row1' },
						{ key: 'row2' },
						{ key: 'row3' },
					],
				},
				{
					key: 'col3',
				},
			],
		};

		validateLayout(layout);

		layout = moveVertical(layout, 'row3', -1);

		expect(layout.children[1].children[0].key).toBe('row1');
		expect(layout.children[1].children[1].key).toBe('row3');
		expect(layout.children[1].children[2].key).toBe('row2');
	});

});
