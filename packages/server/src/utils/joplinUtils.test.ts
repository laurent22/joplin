import { basename } from '@joplin/utils/path';
import { Item } from '../services/database/types';
import { itemIsEncrypted, localFileFromUrl } from './joplinUtils';
import { expectThrow } from './testing/testUtils';

describe('joplinUtils', () => {

	it('should check if an item is encrypted', async () => {
		type TestCase = [boolean, Item];

		const testCases: TestCase[] = [
			[true, { jop_encryption_applied: 1 }],
			[false, { jop_encryption_applied: 0 }],
			[true, { content: Buffer.from('JED01blablablabla', 'utf8') }],
			[false, { content: Buffer.from('plain text', 'utf8') }],
		];

		for (const [expected, input] of testCases) {
			expect(itemIsEncrypted(input)).toBe(expected);
		}

		await expectThrow(async () => itemIsEncrypted({ name: 'missing props' }));
	});

	it.each([
		'css/pluginAssets/../../../test',
		'css/pluginAssets/../../test',
		'js/pluginAssets/./../../test',
	])('localFileFromUrl should prevent access to paths outside the assets directory', async (url) => {
		await expect(localFileFromUrl(url)).rejects.toThrow('Disallowed access:');
	});

	it.each([
		'css/pluginAssets/test.css',
		'js/pluginAssets/subfolder/test.js',
		'css/pluginAssets/testing/this-is-a-test.css',
	])('localFileFromUrl should allow access to paths inside the assets directory', async (url) => {
		const resolvedPath = await localFileFromUrl(url);
		// Should resolve to the same file
		expect(basename(resolvedPath)).toBe(basename(url));
	});
});
