import { replaceSvgWithImg, extractUrls } from './html';
import { Link } from './types';
import { readFile } from 'fs-extra';

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


	test.each([
		'extractSvgSimple.html',
		'extractSvgMultipleSvgs.html',
		'extractSvgWithStyleAndText.html',
		'extractSvgHtmlWithoutSvg.html',
	])('should replace svg nodes with img tags with links to resources', async (filename: string) => {

		const generateId = () => {
			let i = 0;
			return () => `id${i++}`;
		};
		const html = await readFile(`./tests/${filename}`, 'utf8');
		expect(replaceSvgWithImg(html, './resources', generateId())).toMatchSnapshot();
	});
});
