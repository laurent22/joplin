import { LayoutItem, LayoutItemDirection } from '../../../../gui/ResizableLayout/utils/types';
import validateLayout from '../../../../gui/ResizableLayout/utils/validateLayout';
import { moveHorizontal } from '../../../../gui/ResizableLayout/utils/movements';


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

	test('should move items horizontally (2)', () => {
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
	});

});
