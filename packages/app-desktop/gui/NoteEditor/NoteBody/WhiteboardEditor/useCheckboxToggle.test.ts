import { flipNthCheckbox, extractLinkUrl } from './useCheckboxToggle';
import useCheckboxToggle from './useCheckboxToggle';
import { renderHook } from '@testing-library/react';

// Joplin's renderer only converts `- [ ]` / `- [x]` items inside bullet lists
// into clickable checkboxes — `*`, `+`, and numbered list markers are ignored.
// `flipNthCheckbox` must count exactly the same subset so the Nth rendered
// checkbox maps to the Nth source-text checkbox.

describe('useCheckboxToggle', () => {
	test('flips an unchecked box to checked', () => {
		expect(flipNthCheckbox('- [ ] todo', 0)).toBe('- [x] todo');
	});

	test('flips a checked box back to unchecked', () => {
		expect(flipNthCheckbox('- [x] done', 0)).toBe('- [ ] done');
		expect(flipNthCheckbox('- [X] done', 0)).toBe('- [ ] done');
	});

	test('targets the Nth checkbox by zero-based index', () => {
		const body = '- [ ] one\n- [ ] two\n- [ ] three';
		expect(flipNthCheckbox(body, 0)).toBe('- [x] one\n- [ ] two\n- [ ] three');
		expect(flipNthCheckbox(body, 1)).toBe('- [ ] one\n- [x] two\n- [ ] three');
		expect(flipNthCheckbox(body, 2)).toBe('- [ ] one\n- [ ] two\n- [x] three');
	});

	test('returns null when index is out of range', () => {
		expect(flipNthCheckbox('- [ ] only one', 1)).toBeNull();
		expect(flipNthCheckbox('no checkboxes here', 0)).toBeNull();
		expect(flipNthCheckbox('', 0)).toBeNull();
	});

	test('ignores list markers other than `-` to match the renderer', () => {
		// `*`, `+`, and numbered markers are not turned into checkboxes by
		// Joplin's renderer, so they must not affect the index either.
		const body = '* [ ] starred\n+ [ ] plused\n1. [ ] numbered\n- [ ] real';
		// The only "real" checkbox is index 0 — it's the dash-prefixed one.
		expect(flipNthCheckbox(body, 0)).toBe('* [ ] starred\n+ [ ] plused\n1. [ ] numbered\n- [x] real');
		expect(flipNthCheckbox(body, 1)).toBeNull();
	});

	test('ignores `[ ]` not preceded by a list marker', () => {
		expect(flipNthCheckbox('Standalone [ ] not a checkbox', 0)).toBeNull();
	});

	test('handles Windows line endings', () => {
		const body = '- [ ] one\r\n- [ ] two';
		expect(flipNthCheckbox(body, 1)).toBe('- [ ] one\r\n- [x] two');
	});

	test('preserves indentation and the surrounding text', () => {
		const body = 'Intro paragraph.\n\n  - [ ] indented\n  - [x] also indented\n\nOutro.';
		expect(flipNthCheckbox(body, 1)).toBe('Intro paragraph.\n\n  - [ ] indented\n  - [ ] also indented\n\nOutro.');
	});

	describe('extractLinkUrl', () => {
		test('extracts note URL from ipcProxySendToHost onclick attribute', () => {
			const a = document.createElement('a');
			a.setAttribute('onclick', 'ipcProxySendToHost("joplin://0123456789abcdef0123456789abcdef", { resourceId: "0123456789abcdef0123456789abcdef" }); return false;');
			a.setAttribute('href', '#');
			expect(extractLinkUrl(a)).toBe('joplin://0123456789abcdef0123456789abcdef');
		});

		test('extracts note URL with hash anchor from ipcProxySendToHost', () => {
			const a = document.createElement('a');
			a.setAttribute('onclick', 'ipcProxySendToHost("joplin://0123456789abcdef0123456789abcdef#my-heading", { resourceId: "0123456789abcdef0123456789abcdef" }); return false;');
			a.setAttribute('href', '#');
			expect(extractLinkUrl(a)).toBe('joplin://0123456789abcdef0123456789abcdef#my-heading');
		});

		test('extracts external URL from ipcProxySendToHost', () => {
			const a = document.createElement('a');
			a.setAttribute('onclick', 'ipcProxySendToHost("https://example.com/test?q=1", { resourceId: "" }); return false;');
			a.setAttribute('href', 'https://example.com/test?q=1');
			expect(extractLinkUrl(a)).toBe('https://example.com/test?q=1');
		});

		test('extracts URL from postMessage onclick attribute', () => {
			const a = document.createElement('a');
			a.setAttribute('onclick', 'postMessage("https://example.com"); return false;');
			expect(extractLinkUrl(a)).toBe('https://example.com');
		});

		test('extracts URL using data-resource-id attribute when onclick is absent', () => {
			const a = document.createElement('a');
			a.setAttribute('data-resource-id', '0123456789abcdef0123456789abcdef');
			a.setAttribute('href', '#');
			expect(extractLinkUrl(a)).toBe('joplin://0123456789abcdef0123456789abcdef');
		});

		test('extracts URL from standard href attribute', () => {
			const a = document.createElement('a');
			a.setAttribute('href', 'https://joplinapp.org');
			expect(extractLinkUrl(a)).toBe('https://joplinapp.org');

			const fileLink = document.createElement('a');
			fileLink.setAttribute('href', 'file:///tmp/doc.pdf');
			expect(extractLinkUrl(fileLink)).toBe('file:///tmp/doc.pdf');
		});

		test('extracts in-card anchor href', () => {
			const a = document.createElement('a');
			a.setAttribute('href', '#section-1');
			expect(extractLinkUrl(a)).toBe('#section-1');
		});

		test('returns null for empty or hash-only links with no target', () => {
			const empty = document.createElement('a');
			expect(extractLinkUrl(empty)).toBeNull();

			const hashOnly = document.createElement('a');
			hashOnly.setAttribute('href', '#');
			expect(extractLinkUrl(hashOnly)).toBeNull();
		});
	});

	describe('link handling', () => {
		let container: HTMLDivElement;

		beforeEach(() => {
			container = document.createElement('div');
			document.body.appendChild(container);
		});

		afterEach(() => {
			container.remove();
		});

		test('wires up links: strips broken onclick, adds nodrag class, and dispatches onOpenRef on click', () => {
			const onOpenRef = jest.fn();
			const onChange = jest.fn();

			const { result } = renderHook(() =>
				useCheckboxToggle({
					body: 'some markdown',
					onChange,
					onOpenRef,
				}),
			);

			container.innerHTML = `
				<a id="note-link" data-from-md data-resource-id="abc123" href="#" onclick='ipcProxySendToHost("joplin://abc123", { resourceId: "abc123" }); return false;'>Note Link</a>
				<a id="ext-link" data-from-md href="https://example.com" onclick='ipcProxySendToHost("https://example.com", { resourceId: "" }); return false;'>External Link</a>
			`;

			// Attach ref callback to mount container
			result.current(container);

			const noteLink = container.querySelector<HTMLAnchorElement>('#note-link')!;
			const extLink = container.querySelector<HTMLAnchorElement>('#ext-link')!;

			// broken onclick attributes should be stripped
			expect(noteLink.getAttribute('onclick')).toBeNull();
			expect(extLink.getAttribute('onclick')).toBeNull();

			// nodrag class should be added
			expect(noteLink.classList.contains('nodrag')).toBe(true);
			expect(extLink.classList.contains('nodrag')).toBe(true);

			// titles should show destination
			expect(noteLink.title).toBe('joplin://abc123');
			expect(extLink.title).toBe('https://example.com');

			// clicking note link invokes onOpenRef
			noteLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
			expect(onOpenRef).toHaveBeenCalledWith('joplin://abc123');

			// clicking external link invokes onOpenRef
			extLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
			expect(onOpenRef).toHaveBeenCalledWith('https://example.com');
		});

		test('middle-click (auxclick) opens link and dblclick stops propagation', () => {
			const onOpenRef = jest.fn();
			const onChange = jest.fn();

			const { result } = renderHook(() =>
				useCheckboxToggle({
					body: '',
					onChange,
					onOpenRef,
				}),
			);

			container.innerHTML = '<a id="test-link" href="https://example.com">Example</a>';
			result.current(container);

			const link = container.querySelector<HTMLAnchorElement>('#test-link')!;

			// Middle click (button 1)
			link.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }));
			expect(onOpenRef).toHaveBeenCalledWith('https://example.com');

			// Double click should stop propagation
			const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
			const stopPropagationSpy = jest.spyOn(dblClickEvent, 'stopPropagation');
			link.dispatchEvent(dblClickEvent);
			expect(stopPropagationSpy).toHaveBeenCalled();
		});

		test('scrolls to in-card anchor when an anchor link is clicked', () => {
			const onOpenRef = jest.fn();
			const onChange = jest.fn();

			const { result } = renderHook(() =>
				useCheckboxToggle({
					body: '',
					onChange,
					onOpenRef,
				}),
			);

			container.innerHTML = `
				<a id="anchor-link" href="#heading-target">Jump</a>
				<div id="heading-target">Target</div>
			`;

			const target = container.querySelector('#heading-target')!;
			target.scrollIntoView = jest.fn();

			result.current(container);

			const link = container.querySelector<HTMLAnchorElement>('#anchor-link')!;
			link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

			expect(target.scrollIntoView).toHaveBeenCalled();
			expect(onOpenRef).not.toHaveBeenCalled();
		});
	});
});
