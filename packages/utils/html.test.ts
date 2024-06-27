import { readFile } from 'fs-extra';
import { extractSvgs, extractUrls } from './html';
import { Link } from './types';

describe('htmlUtils', () => {

	test.each([
		[
			'',
			[],
		],
		[
			'bla >Testing <b>no link</b>"',
			[],
		],
		[
			'bla <a href="https://example.com">Testing <b>link</b></a>"',
			[
				{
					url: 'https://example.com',
					title: 'Testing link',
				},
			],
		],
		[
			'<a href="#">Test 1</a> <a onclick="">Test 2</a>',
			[
				{
					url: '#',
					title: 'Test 1',
				},
				{
					url: '',
					title: 'Test 2',
				},
			],
		],
		[
			'<a href="https://example.com"><img src="https://test.com/image.png"/></a>',
			[
				{
					url: 'https://example.com',
					title: '',
				},
			],
		],
		[
			'<a href="#">check &amp; encoding</a>',
			[
				{
					url: '#',
					title: 'check & encoding',
				},
			],
		],
	])('should retrieve links', (html: string, expected: Link[]) => {
		const actual = extractUrls(html);
		expect(actual).toEqual(expected);
	});

	it.only.each([
		'svg_with_text_and_style.html',
	])('should extract svgs', async (filename: string) => {
		const titleGenerator = () => {
			let id = 0;
			return () => {
				id += 1;
				return `id${id}.svg`;
			};
		};
		const filepath = `${__dirname}/__fixtures__/${filename}`;
		const content = await readFile(filepath, 'utf-8');

		expect(extractSvgs(content, titleGenerator())).toMatchSnapshot();
	});
});
