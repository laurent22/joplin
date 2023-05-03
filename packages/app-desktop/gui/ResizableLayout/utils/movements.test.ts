import { LayoutItem, LayoutItemDirection } from './types';
import validateLayout from './validateLayout';
import { canMove, MoveDirection, moveHorizontal, moveVertical } from './movements';
import findItemByKey from './findItemByKey';

describe('movements', () => {

	test('should move items horizontally to the right', () => {
		let layout: LayoutItem = validateLayout({
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
		});

		expect(() => moveHorizontal(layout, 'col1', -1)).toThrow();

		layout = moveHorizontal(layout, 'col1', 1);

		expect(layout.children[0].children[0].key).toBe('col2');
		expect(layout.children[0].children[1].key).toBe('col1');
		expect(layout.children[1].key).toBe('col3');

		layout = moveHorizontal(layout, 'col1', 1);

		expect(layout.children[0].key).toBe('col2');
		expect(layout.children[1].key).toBe('col1');
		expect(layout.children[2].key).toBe('col3');

		layout = moveHorizontal(layout, 'col1', 1);
		layout = moveHorizontal(layout, 'col1', 1);

		expect(() => moveHorizontal(layout, 'col1', 1)).toThrow();
	});

	test('should move items horizontally to the left', () => {
		let layout: LayoutItem = validateLayout({
			key: 'root',
			width: 100,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
					direction: LayoutItemDirection.Column,
					children: [
						{ key: 'item1' },
						{ key: 'item2' },
					],
				},
				{
					key: 'col2',
				},
			],
		});

		layout = moveHorizontal(layout, 'item2', -1);

		expect(layout.children[0].key).toBe('item2');
		expect(layout.children[1].key).toBe('item1');
		expect(layout.children[2].key).toBe('col2');
	});

	test('should move items vertically', () => {
		let layout: LayoutItem = validateLayout({
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
		});

		layout = moveVertical(layout, 'row3', -1);

		expect(layout.children[1].children[0].key).toBe('row1');
		expect(layout.children[1].children[1].key).toBe('row3');
		expect(layout.children[1].children[2].key).toBe('row2');
	});

	test('should tell if item can be moved', () => {
		const layout: LayoutItem = validateLayout({
			key: 'root',
			width: 200,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
					resizableRight: true,
					direction: LayoutItemDirection.Column,
					children: [
						{ key: 'row1' },
						{ key: 'row2' },
					],
				},
				{
					key: 'col2',
				},
			],
		});

		expect(canMove(MoveDirection.Up, findItemByKey(layout, 'col1'), findItemByKey(layout, 'root'))).toBe(false);
		expect(canMove(MoveDirection.Down, findItemByKey(layout, 'col1'), findItemByKey(layout, 'root'))).toBe(false);
		expect(canMove(MoveDirection.Left, findItemByKey(layout, 'col1'), findItemByKey(layout, 'root'))).toBe(false);
		expect(canMove(MoveDirection.Right, findItemByKey(layout, 'col1'), findItemByKey(layout, 'root'))).toBe(true);

		expect(canMove(MoveDirection.Up, findItemByKey(layout, 'row1'), findItemByKey(layout, 'col1'))).toBe(false);
		expect(canMove(MoveDirection.Down, findItemByKey(layout, 'row1'), findItemByKey(layout, 'col1'))).toBe(true);
		expect(canMove(MoveDirection.Left, findItemByKey(layout, 'row1'), findItemByKey(layout, 'col1'))).toBe(true);
		expect(canMove(MoveDirection.Right, findItemByKey(layout, 'row1'), findItemByKey(layout, 'col1'))).toBe(true);

		expect(canMove(MoveDirection.Up, findItemByKey(layout, 'row2'), findItemByKey(layout, 'col1'))).toBe(true);
		expect(canMove(MoveDirection.Down, findItemByKey(layout, 'row2'), findItemByKey(layout, 'col1'))).toBe(false);
		expect(canMove(MoveDirection.Left, findItemByKey(layout, 'row2'), findItemByKey(layout, 'col1'))).toBe(true);
		expect(canMove(MoveDirection.Right, findItemByKey(layout, 'row2'), findItemByKey(layout, 'col1'))).toBe(true);

		expect(canMove(MoveDirection.Up, findItemByKey(layout, 'col2'), findItemByKey(layout, 'root'))).toBe(false);
		expect(canMove(MoveDirection.Down, findItemByKey(layout, 'col2'), findItemByKey(layout, 'root'))).toBe(false);
		expect(canMove(MoveDirection.Left, findItemByKey(layout, 'col2'), findItemByKey(layout, 'root'))).toBe(true);
		expect(canMove(MoveDirection.Right, findItemByKey(layout, 'col2'), findItemByKey(layout, 'root'))).toBe(false);
	});

	test('container with only one child should take the width of its parent', () => {
		let layout: LayoutItem = validateLayout({
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
				},
			],
		});

		layout = moveHorizontal(layout, 'col2', -1);

		expect(layout.children[0].children[0].key).toBe('col1');
		expect(layout.children[0].children[0].width).toBe(undefined);
	});

	test('temp container should take the width of the child it replaces', () => {
		let layout: LayoutItem = validateLayout({
			key: 'root',
			width: 100,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
					width: 20,
				},
				{
					key: 'col2',
					width: 80,
				},
				{
					key: 'col3',
				},
			],
		});

		layout = moveHorizontal(layout, 'col2', -1);

		expect(layout.children[0].width).toBe(20);
		expect(layout.children[0].children[0].width).toBe(undefined);
		expect(layout.children[0].children[1].width).toBe(undefined);
	});

	test('last child should have flexible width if all siblings have fixed width', () => {
		let layout: LayoutItem = validateLayout({
			key: 'root',
			width: 100,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
					width: 20,
				},
				{
					key: 'col2',
					width: 20,
				},
				{
					key: 'col3',
				},
			],
		});

		layout = moveHorizontal(layout, 'col3', -1);

		expect(layout.children[0].width).toBe(20);
		expect(layout.children[1].width).toBe(undefined);
	});

});
