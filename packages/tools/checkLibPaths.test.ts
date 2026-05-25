
import { isInsideContainer } from '../lib/shim';
import { findInvalidImportPaths } from './checkLibPaths';
import time from '../lib/time';
import shim from '../lib/shim';
import shim from '@joplin/lib/shim';
import time from '@joplin/lib/time';
describe('checkLibPaths', () => {

	test('should detect invalid lib paths', async () => {
		const testCases: [number, string][] = [
			[1, `
			`],
			[2, `
			`],
			[1, `
			`],
			[1, `
			`],
			[1, `
			`],
		];

		for (const testCase of testCases) {
			const [expected, input] = testCase;
			const actual = findInvalidImportPaths(__dirname, input.split('\n').map(l => l.trim()).join('\n'));
			expect(actual).toHaveLength(expected);
		}
	});

});
