/** @jest-environment jsdom */
import { handleAnchorClick } from './index';

describe('index.handleAnchorClick', () => {
	let document: Document;
	let scrollIntoViewMock: jest.Mock;

	beforeEach(() => {
		document = window.document;
		document.body.innerHTML = `
            <h2 id="section-a">Section A</h2>
            <h2 id="section-b">Section B</h2>
            <a id="link-a" href="#section-a">Go to A</a>
            <a id="link-b" href="#section-b">Go to B</a>
            <a id="link-ext" href="https://example.com/page#section">External</a>
        `;
		scrollIntoViewMock = jest.fn();
		Element.prototype.scrollIntoView = scrollIntoViewMock;

		document.addEventListener('click', handleAnchorClick, true);
	});

	afterEach(() => {
		document.removeEventListener('click', handleAnchorClick, true);
		jest.clearAllMocks();
	});

	test('scrollIntoView is called even when the same link is clicked twice', () => {
		const linkA = document.getElementById('link-a')!;

		linkA.click();
		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

		linkA.click();
		expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
	});

	test('scrollIntoView is called for each click when different links are clicked alternately', () => {
		document.getElementById('link-a')!.click();
		document.getElementById('link-b')!.click();
		document.getElementById('link-a')!.click();

		expect(scrollIntoViewMock).toHaveBeenCalledTimes(3);
	});

	test('does not intercept external links (http://...#hash)', () => {
		const linkExt = document.getElementById('link-ext')!;
		linkExt.click();

		expect(scrollIntoViewMock).not.toHaveBeenCalled();
	});

	test('works with URL-encoded Japanese anchors', () => {
		document.body.innerHTML += `
            <h2 id="セクション">日本語セクション</h2>
            <a id="link-ja" href="#%E3%82%BB%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3">日本語リンク</a>
        `;
		document.getElementById('link-ja')!.click();
		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
	});

	test('does not throw when clicking a link to a missing anchor', () => {
		document.body.innerHTML += '<a id="link-dead" href="#missing-section">dead link</a>';
		expect(() => {
			document.getElementById('link-dead')!.click();
		}).not.toThrow();
	});
});
