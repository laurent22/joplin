import { extractUrls } from './markdown';
import { Link } from './types';

describe('markdown', () => {

	test.each([
		[
			'',
			[],
		],
		[
			'Some text and no links',
			[],
		],
		[
			'[](https://example.com)',
			[
				{
					url: 'https://example.com',
					title: '',
				},
			],
		],
		[
			'before [testing](https://example.com) [testing **with bold**](https://example2.com) after',
			[
				{
					url: 'https://example.com',
					title: 'testing',
				},
				{
					url: 'https://example2.com',
					title: 'testing with bold',
				},
			],
		],
		[
			'[Testing MD](https://example.com/md) <a href="https://example.com/html">Testing HTML</a>',
			[
				{
					url: 'https://example.com/md',
					title: 'Testing MD',
				},
				{
					url: 'https://example.com/html',
					title: 'Testing HTML',
				},
			],
		],
	])('should extract URLs', (md: string, expected: Link[]) => {
		const actual = extractUrls(md);
		expect(actual).toEqual(expected);
	});

});
