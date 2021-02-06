import { parseSubPath, splitItemPath } from './routeUtils';
import { ItemAddressingType } from '../db';

describe('routeUtils', function() {

	it('should parse a route path', async function() {
		const testCases: any[] = [
			['123456/content', '123456', 'content', ItemAddressingType.Id],
			['123456', '123456', '', ItemAddressingType.Id],
			['root:/Documents/MyFile.md:/content', 'root:/Documents/MyFile.md:', 'content', ItemAddressingType.Path],
			['root:/Documents/MyFile.md:', 'root:/Documents/MyFile.md:', '', ItemAddressingType.Path],
			['', '', '', ItemAddressingType.Id],
		];

		for (const t of testCases) {
			const path = t[0];
			const id = t[1];
			const link = t[2];
			const addressingType = t[3];

			const parsed = parseSubPath('', path);
			expect(parsed.id).toBe(id);
			expect(parsed.link).toBe(link);
			expect(parsed.addressingType).toBe(addressingType);
		}
	});

	it('should split an item path', async function() {
		const testCases: any[] = [
			['root:/Documents/MyFile.md:', ['root', 'Documents', 'MyFile.md']],
			['documents:/CV.doc:', ['documents', 'CV.doc']],
			['', []],
		];

		for (const t of testCases) {
			const path = t[0];
			const expected = t[1];
			const splitted = splitItemPath(path);

			expect(JSON.stringify(splitted)).toBe(JSON.stringify(expected));
		}
	});

});
