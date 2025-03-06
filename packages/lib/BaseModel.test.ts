import BaseModel from './BaseModel';

describe('BaseModel', () => {
	test.each([
		[0, 0],
		[4, 10],
		[10, 4],
		[5, 5],
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
