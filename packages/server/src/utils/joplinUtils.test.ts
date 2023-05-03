import { Item } from '../services/database/types';
import { itemIsEncrypted } from './joplinUtils';
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

});
