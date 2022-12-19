import { extractOpenGraphTags, OpenGraphTags } from './openGraph';
import { tempFilePath } from '@joplin/lib/testing/test-utils';
import { writeFile } from 'fs-extra';

describe('openGraph', function() {

	it('should extract the Open Graph tags', async function() {
		const tests: [string, OpenGraphTags][] = [

			['# My title\n\nMy note description **with bold text**', {
				title: 'My title',
				description: 'My note description with bold text',
				url: 'https://test.com',
			}],

			['# My very very very very very very very very very very very very long title\n\nMy description that is over 200 characters. My description that is over 200 characters. My description that is over 200 characters. My description that is over 200 characters. My description that is over 200 characters.', {
				title: 'My very very very very very very very very very very very very long...',
				description: 'My description that is over 200 characters. My description that is over 200 characters. My description that is over 200 characters. My description that is over 200 characters. My description that i...',
				url: 'https://test.com',
			}],

			['# Page with an image\n\nSome text followed by an image. ![](https://test.com/hello1.png) ![](https://test.com/hello2.png)', {
				title: 'Page with an image',
				description: 'Some text followed by an image.',
				url: 'https://test.com',
				image: 'https://test.com/hello1.png',
			}],

			['# Image without domain\n\n![](/hello1.png)', {
				title: 'Image without domain',
				description: '',
				url: 'https://test.com',
				image: 'https://joplinapp.org/hello1.png',
			}],
		];

		for (const test of tests) {
			const [input, expected] = test;
			const filePath = await tempFilePath('md');
			await writeFile(filePath, input);
			const actual = await extractOpenGraphTags(filePath, 'https://test.com');
			expect(actual).toEqual(expected);
		}
	});

});
