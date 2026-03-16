import { describe, test, expect } from '@jest/globals';
import abc from './abc';

describe('abc assets', () => {
	test('should include overflow-x rule on the rendered container to prevent clipping', () => {
		const assets = abc.assets();
		const cssAsset = assets.find(a => 'text' in a) as { text: string } | undefined;
		expect(cssAsset).toBeDefined();
		expect(cssAsset!.text).toContain('joplin-abc-notation-rendered');
		expect(cssAsset!.text).toContain('overflow-x');
	});
});
