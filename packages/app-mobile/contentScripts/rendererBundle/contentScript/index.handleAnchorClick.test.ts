/** @jest-environment jsdom */
import { handleAnchorClick } from './index';

describe('index.handleAnchorClick', () => {
	let document: Document;
	let scrollIntoViewMock: jest.Mock;

	// Helper function to replace .click() and avoid code duplication.
	// We dispatch a cancelable event so e.preventDefault() can actually stop the navigation.
	const simulateClick = (element: HTMLElement) => {
		element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	};

	const preventNavigation = (e: Event) => e.preventDefault();

	beforeAll(() => {
		// JSDOM intentionally does not support full-page navigation.
		// When our logic correctly ignores an external link, the click event bubbles up
		// and triggers the native browser navigation, causing a "Not implemented: navigation" error.
		// This global listener stops the native navigation attempt for the entire test suite.
		window.addEventListener('click', preventNavigation);
	});

	afterAll(() => {
		window.removeEventListener('click', preventNavigation);
	});

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

		simulateClick(linkA);
		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

		simulateClick(linkA);
		expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
	});

	test('scrollIntoView is called for each click when different links are clicked alternately', () => {
		simulateClick(document.getElementById('link-a')!);
		simulateClick(document.getElementById('link-b')!);
		simulateClick(document.getElementById('link-a')!);

		expect(scrollIntoViewMock).toHaveBeenCalledTimes(3);
	});

	test('does not intercept external links (http://...#hash)', () => {
		const linkExt = document.getElementById('link-ext')!;

		simulateClick(linkExt);

		expect(scrollIntoViewMock).not.toHaveBeenCalled();
	});

	test('works with URL-encoded Japanese anchors', () => {
		document.body.innerHTML += `
            <h2 id="セクション">日本語セクション</h2>
            <a id="link-ja" href="#%E3%82%BB%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3">日本語リンク</a>
        `;
		simulateClick(document.getElementById('link-ja')!);
		expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
	});

	test('does not throw when clicking a link to a missing anchor', () => {
		document.body.innerHTML += '<a id="link-dead" href="#missing-section">dead link</a>';
		expect(() => {
			simulateClick(document.getElementById('link-dead')!);
		}).not.toThrow();
	});
});
