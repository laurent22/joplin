import useLayoutItemSizes from './useLayoutItemSizes';
import { LayoutItem, LayoutItemDirection } from './types';
import { renderHook } from '@testing-library/react-hooks';
import validateLayout from './validateLayout';


describe('useLayoutItemSizes', () => {

	test('should give item sizes', () => {
		const layout:LayoutItem = {
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
		};

		validateLayout(layout);

		const { result } = renderHook(() => useLayoutItemSizes(layout));
		const sizes = result.current;

		expect(sizes.root).toEqual({ width: 200, height: 100 });
		expect(sizes.col1).toEqual({ width: 50, height: 100 });
		expect(sizes.col2).toEqual({ width: 150, height: 100 });
	});

	test('should leave space for drag bar', () => {
		const layout:LayoutItem = {
			key: 'root',
			width: 200,
			height: 100,
			direction: LayoutItemDirection.Row,
			children: [
				{
					key: 'col1',
					width: 50,
					resizableRight: true,
					children: [
						{
							key: 'col1_row1',
						},
					],
				},
				{
					key: 'col2',
				},
			],
		};

		validateLayout(layout);

		const { result } = renderHook(() => useLayoutItemSizes(layout));
		const sizes = result.current;

		expect(sizes.col1).toEqual({ width: 50, height: 100 });
		expect(sizes.col2).toEqual({ width: 150, height: 100 });
		expect(sizes.col1_row1).toEqual({ width: 45, height: 100 });
	});

	test('should handle multiple rows', () => {
		const layout:LayoutItem = {
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
					direction: LayoutItemDirection.Column,
					children: [
						{
							key: 'col2_row1',
							height: 10,
						},
						{
							key: 'col2_row2',
							resizableBottom: true,
							children: [
								{
									key: 'subsubsub',
								},
							],
						},
						{
							key: 'col2_row3',
							height: 10,
						},
					],
				},
			],
		};

		validateLayout(layout);

		const { result } = renderHook(() => useLayoutItemSizes(layout));
		const sizes = result.current;

		expect(sizes.col1).toEqual({ width: 50, height: 100 });
		expect(sizes.col2).toEqual({ width: 150, height: 100 });
		expect(sizes.col2_row1).toEqual({ width: 150, height: 10 });
		expect(sizes.col2_row2).toEqual({ width: 150, height: 80 });
		expect(sizes.subsubsub).toEqual({ width: 150, height: 75 });
		expect(sizes.col2_row3).toEqual({ width: 150, height: 10 });
	});

});
