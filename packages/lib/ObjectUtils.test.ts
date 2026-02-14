import { convertValuesToFunctions, sortByValue } from './ObjectUtils';

describe('ObjectUtils', () => {
	test('should convert object values to functions', () => {
		const v = convertValuesToFunctions({ a: 6, b: ()=>7, c: 'test' });
		expect(v.a()).toBe(6);
		expect(v.b()).toBe(7);
		expect(v.c()).toBe('test');
	});

	test('should sort an object\'s entries by value', () => {
		expect(sortByValue({
			a: 1,
			b: 'test1',
			c: 'test3',
			d: 'test2',
		})).toEqual({
			b: 'test1',
			d: 'test2',
			c: 'test3',
			a: 1,
		});
	});
});
