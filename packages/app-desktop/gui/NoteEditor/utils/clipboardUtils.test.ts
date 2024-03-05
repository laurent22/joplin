import { htmlToClipboardData } from './clipboardUtils';

describe('clipboardUtils', () => {

	test('should convert HTML to the right format', () => {
		const testCases = [
			[
				'<h1>Header</h1>',
				'# Header',
				'<h1>Header</h1>',
			],
			[
				'<p>One line</p><p>Two line</p>',
				'One line\n\nTwo line',
				'<p>One line</p><p>Two line</p>',
			],
			[
				'<div id="rendered-md"><p>aaa</p><div class="joplin-editable" contenteditable="false"><pre class="joplin-source" data-joplin-language="javascript" data-joplin-source-open="```javascript\n" data-joplin-source-close="\n```">var a = 123;</pre><pre class="hljs"><code><span class="hljs-keyword">var</span> a = <span class="hljs-number">123</span>;</code></pre></div><ul class="joplin-checklist"><li class="checked">A checkbox</li></ul></div>',
				'aaa\n\n```javascript\nvar a = 123;\n```\n\n- [x] A checkbox',
				'<div id="rendered-md"><p>aaa</p><div class="joplin-editable" contenteditable="false"><pre class="hljs"><code><span class="hljs-keyword">var</span> a = <span class="hljs-number">123</span>;</code></pre></div><ul class="joplin-checklist"><li class="checked">A checkbox</li></ul></div>',
			],
		];

		for (const testCase of testCases) {
			const [inputHtml, expectedText, expectedHtml] = testCase;
			const result = htmlToClipboardData(inputHtml);
			expect(result.html).toBe(expectedHtml);
			expect(result.text).toBe(expectedText);
		}
	});

	test('should remove parameters from local images', () => {
		const localImage = 'file:///home/some/path/test.jpg';

		const content = `<div><img src="${localImage}?a=1&b=2"></div>`;
		const copyableContent = htmlToClipboardData(content);

		expect(copyableContent.html).toEqual(`<div><img src="${localImage}"></div>`);
	});

	test('should be able to process multiple images', () => {
		const localImage1 = 'file:///home/some/path/test1.jpg';
		const localImage2 = 'file:///home/some/path/test2.jpg';
		const localImage3 = 'file:///home/some/path/test3.jpg';

		const content = `
      <div>
        <img src="${localImage1}?a=1&b=2">
        <img src="${localImage2}">
        <img src="${localImage3}?t=1">
      </div>`;

		const copyableContent = htmlToClipboardData(content);
		const expectedContent = `
      <div>
        <img src="${localImage1}">
        <img src="${localImage2}">
        <img src="${localImage3}">
      </div>`;

		expect(copyableContent.html).toEqual(expectedContent);
	});

	test('should not change parameters for images on the internet', () => {
		const image1 = 'http://www.somelink.com/image1.jpg';
		const image2 = 'https://www.somelink.com/image2.jpg';

		const content = `
      <div>
        <img src="${image1}">
        <img src="${image2}?h=12&amp;w=15">
      </div>`;

		const copyableContent = htmlToClipboardData(content);

		expect(copyableContent.html).toEqual(content);
	});

});
