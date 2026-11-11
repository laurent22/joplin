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

	test.each([
		[0, false],
		[12, false],
		[4096, false],
		[4097, true],
		[100000, true],
	])('userSideValidation should reject overly long titles (length: %d)', (length, shouldThrow) => {
		const run = () => BaseModel.userSideValidation({ title: 'x'.repeat(length) });
		if (shouldThrow) {
			expect(run).toThrow(/title must be 4096 characters or less/);
		} else {
			expect(run).not.toThrow();
		}
	});

	const nul = String.fromCharCode(0);
	test.each([
		[{ title: 'fine', body: 'fine' }, false],
		[{ title: `bad${nul}title`, body: 'fine' }, true],
		[{ title: 'fine', body: `bad${nul}body` }, true],
		[{ source_url: `https://example.com/${nul}` }, true],
		[{ title: 'fine' }, false],
		[{ body: 'fine' }, false],
	])('userSideValidation should reject any string field containing a null byte (input: %j)', (input, shouldThrow) => {
		const run = () => BaseModel.userSideValidation(input);
		if (shouldThrow) {
			expect(run).toThrow(/null byte/);
		} else {
			expect(run).not.toThrow();
		}
	});
});
