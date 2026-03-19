import { randomWeightedElement } from './array';

describe('array', () => {
	it('should select an item from the provided array based on the given weights', () => {
		expect(randomWeightedElement([1, 2, 3], [1, 0, 0])).toBe(1);
		expect(randomWeightedElement([1, 2, 3], [0, 1, 0])).toBe(2);
		expect(randomWeightedElement([1, 2, 3], [0, 0, 1])).toBe(3);
	});

	it('should use the provided random number generator', () => {
		expect(randomWeightedElement([1, 2, 3], [0.25, 0.75, 0.25], () => 0.5)).toBe(2);
		expect(randomWeightedElement([1, 2, 3], [0.25, 0.75, 0.25], () => 0)).toBe(1);
		expect(randomWeightedElement([1, 2, 3], [0.25, 0.75, 0.25], () => 0.9999)).toBe(3);
	});

	it('should throw if all weights are zero', () => {
		expect(() => randomWeightedElement([1, 2, 3], [0, 0, 0])).toThrow();
	});
});
