import useLayoutItemSizes, { itemSize } from './useLayoutItemSizes';
import { LayoutItem, LayoutItemDirection } from './types';
import { renderHook } from '@testing-library/react-hooks';
import validateLayout from './validateLayout';
import { canMove, MoveDirection } from './movements';
import { findItemByKey } from '../ResizableLayout';


describe('useLayoutItemSizes', () => {

	test('should validate the layout', () => {
		const layout:LayoutItem = validateLayout({
			key: 'root',
			width: 200,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{ key: 'col1' },
				{ key: 'col2' },
			],
		});

		expect(layout.isRoot).toBe(true);
	});

	test('should give item sizes', () => {
		const layout:LayoutItem = validateLayout({
			key: 'root',
			width: 200,
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

		const { result } = renderHook(() => useLayoutItemSizes(layout));
		const sizes = result.current;

		expect(sizes.root).toEqual({ width: 200, height: 100 });
		expect(sizes.col1).toEqual({ width: 50, height: 100 });
		expect(sizes.col2).toEqual({ width: 150, height: 100 });
	});

	test('should leave room for the resizer controls', () => {
		const layout:LayoutItem = validateLayout({
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
						{ key: 'row1', resizableBottom: true },
						{ key: 'row2' },
					],
				},
				{
					key: 'col2',
				},
			],
		});

		const { result } = renderHook(() => useLayoutItemSizes(layout));

		const sizes = result.current;

		expect(sizes).toEqual({
			root: { width: 200, height: 100 },
			col1: { width: 100, height: 100 },
			col2: { width: 100, height: 100 },
			row1: { width: 100, height: 50 },
			row2: { width: 100, height: 50 },
		});

		expect(itemSize(layout.children[0], layout, sizes, true)).toEqual({ width: 100, height: 100 });

		const parent = layout.children[0];
		expect(itemSize(parent.children[0], parent, sizes, false)).toEqual({ width: 95, height: 45 });
		expect(itemSize(parent.children[1], parent, sizes, false)).toEqual({ width: 95, height: 50 });
	});

	test('should tell if item can be moved', () => {
		const layout:LayoutItem = validateLayout({
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

});
