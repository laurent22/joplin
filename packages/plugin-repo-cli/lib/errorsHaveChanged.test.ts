import errorsHaveChanged from './errorsHaveChanged';

describe('errorsHaveChanged', () => {

	test('should tell if an errors object has changed', () => {
		const testCases = [
			[
				{
					'one': '111',
					'two': '222',
				},
				{
					'two': '222',
					'one': '111',
				},
				false,
			],
			[
				{
					'one': '111',
					'two': '222',
				},
				{
					'one': '111',
					'two': '222',
				},
				false,
			],
			[
				{
					'one': '111',
					'two': '222',
				},
				{
					'one': '111',
				},
				true,
			],
			[
				{
					'one': '111',
					'two': '222',
				},
				{
					'one': '222',
					'two': '111',
				},
				true,
			],
			[
				{},
				{},
				false,
			],
		];

		for (const t of testCases) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const [oldErrors, newErrors, expected] = t as any;

			const result = errorsHaveChanged(oldErrors, newErrors);
			expect(result).toBe(expected);
		}
	});

});
