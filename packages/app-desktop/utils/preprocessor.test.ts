import preprocessor from './preprocessor';


describe('preprocessor.openDetailsTags', () => {
	test('Adding the open attribute without other classes', () => {
		const result = preprocessor.openDetailsTags('<details></details>');
		expect(result).toBe('<details open ></details>');
	});

	test('Adding the open attribute with other classes', () => {
		const result = preprocessor.openDetailsTags('<details class="test"></details>');
		expect(result).toBe('<details open  class="test"></details>');
	});

	test('Adding the open attribute with child elements', () => {
		const result = preprocessor.openDetailsTags('<details class="test"><summary>Test</summary><p>Element 1</p></details>');
		expect(result).toBe('<details open  class="test"><summary>Test</summary><p>Element 1</p></details>');
	});

	test('Should Not add the open attribute without other classes', () => {
		const result = preprocessor.openDetailsTags('<details open></details>');
		expect(result).toBe('<details open></details>');
	});

	test('Should Not add the open attribute with other classes', () => {
		const result = preprocessor.openDetailsTags('<details class="test" open></details>');
		expect(result).toBe('<details class="test" open></details>');
	});

});
