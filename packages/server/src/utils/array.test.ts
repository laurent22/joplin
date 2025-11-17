import { unique } from './array';

describe('array', () => {
	it('should return unique items in a short array', () => {
		expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
	});

	it('should return unique items in a large array', () => {
		const array = [];

		for (let j = 0; j < 2; j++) {
			for (let i = 0; i < 1024; i++) {
				array.push(i);
			}
		}

		// Every item should be present twice
		expect(array).toHaveLength(2048);
		expect(unique(array)).toHaveLength(1024);
	});
});
