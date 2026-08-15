import { headingTextToAnchorName } from './headerAnchor';

describe('headerAnchor', () => {

	test('should convert normal heading text to anchor names', () => {
		const testCases = [
			['My Title', 'my-title'],
			['Hello World', 'hello-world'],
			['Simple', 'simple'],
			['With Numbers 123', 'with-numbers-123'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should strip unchecked checkbox from beginning', () => {
		const testCases = [
			['[ ] My Task', 'my-task'],
			['[ ]Buy groceries', 'buy-groceries'],
			['[ ] Task with spaces', 'task-with-spaces'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should strip checked checkbox from beginning', () => {
		const testCases = [
			['[x] My Task', 'my-task'],
			['[x]Buy groceries', 'buy-groceries'],
			['[x] Task with spaces', 'task-with-spaces'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should strip uppercase X checkbox from beginning', () => {
		const testCases = [
			['[X] My Task', 'my-task'],
			['[X]Buy groceries', 'buy-groceries'],
			['[X] Done Task', 'done-task'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should produce same slug for checked and unchecked checkbox variants', () => {
		const doneNames: string[] = [];
		const input1 = '[x] Buy groceries';
		const input2 = '[ ] Buy groceries';

		const anchor1 = headingTextToAnchorName(input1, []);
		const anchor2 = headingTextToAnchorName(input2, []);

		expect(anchor1).toBe(anchor2);
		expect(anchor1).toBe('buy-groceries');
	});

	test('should NOT strip checkbox patterns in middle of heading', () => {
		const testCases = [
			['My [x] Task', 'my-x-task'],
			['Hello [X] World', 'hello-x-world'],
			['Check [ ] this', 'check-this'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should handle special characters', () => {
		const testCases = [
			['Hello World!', 'hello-world'],
			['Test@Home', 'testhome'],
			['Multiple---Dashes', 'multiple-dashes'],
			['Trailing dashes---', 'trailing-dashes'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should handle empty and whitespace-only strings', () => {
		const testCases = [
			['', ''],
			['   ', ''],
			['!@#$', ''],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should handle duplicate heading names with numeric suffixes', () => {
		const doneNames: string[] = [];

		const anchor1 = headingTextToAnchorName('My Title', doneNames);
		doneNames.push(anchor1);

		const anchor2 = headingTextToAnchorName('My Title', doneNames);
		doneNames.push(anchor2);

		const anchor3 = headingTextToAnchorName('My Title', doneNames);

		expect(anchor1).toBe('my-title');
		expect(anchor2).toBe('my-title-1');
		expect(anchor3).toBe('my-title-2');
	});

	test('should handle duplicate heading names with checkboxes', () => {
		const doneNames: string[] = [];

		const anchor1 = headingTextToAnchorName('[x] Task', doneNames);
		doneNames.push(anchor1);

		const anchor2 = headingTextToAnchorName('[ ] Task', doneNames);

		expect(anchor1).toBe('task');
		expect(anchor2).toBe('task-1');
	});

	test('should handle checkbox without space after', () => {
		const testCases = [
			['[x]Task', 'task'],
			['[X]Test', 'test'],
			['[ ]Item', 'item'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

	test('should handle mixed case normalization', () => {
		const testCases = [
			['[X] CamelCase Title', 'camelcase-title'],
			['[x] UPPERCASE TEXT', 'uppercase-text'],
			['[ ] MixedCase With Numbers 123', 'mixedcase-with-numbers-123'],
		];

		for (const [input, expected] of testCases) {
			const actual = headingTextToAnchorName(input, []);
			expect(actual).toBe(expected);
		}
	});

});
