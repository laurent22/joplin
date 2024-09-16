import BaseModel from './BaseModel';

describe('BaseModel', () => {
	test.each([
		[50, 50],
		[100, 60],
		[60, 100],
		[0, 0],
		[5, 3],
		[3, 5],
	])('should filter items by IDs (itemCount: %d, idCount: %d)', (itemCount, idCount) => {
		const items = [];
		const ids = [];

		const expectedMatchingItems = [];
		for (let i = 0; i < idCount; i++) {
			const id = `matching-${i}`;
			ids.push(id);

			if (items.length < itemCount) {
				const item = { id };
				items.push(item);
				expectedMatchingItems.push(item);
			}
		}

		while (items.length < itemCount) {
			items.push({ id: `non-matching-${items.length}` });
		}

		expect(BaseModel.modelsByIds(items, ids)).toMatchObject(expectedMatchingItems);
	});
});
