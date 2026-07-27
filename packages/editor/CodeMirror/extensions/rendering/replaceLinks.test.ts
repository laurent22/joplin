import createTestEditor from '../../testing/createTestEditor';
import { EditorSelection } from '@codemirror/state';
import replaceLinks from './replaceLinks';

describe('replaceLinks', () => {
	it.each([
		{
			label: 'should not hide link Markdown when the label is empty',
			markup: 'test: [](https://example.com)',
			expectedText: 'test: [](https://example.com)',

			expectedSyntaxTags: ['URL', 'LinkMark', 'Link'],
		},
		{
			label: 'should not hide whitespace-only links',
			markup: 'test: [ ](https://example.com)',
			expectedText: 'test: [ ](https://example.com)',

			expectedSyntaxTags: ['URL', 'LinkMark', 'Link'],
		},
		{
			label: 'should hide link Markdown when a title is present',
			markup: 'test: [test](https://example.com)',
			expectedText: 'test: test',

			expectedSyntaxTags: ['URL', 'LinkMark', 'Link'],
		},
		{
			label: 'should not hide URLs with no label section',
			markup: 'test: https://example.com',
			expectedText: 'test: https://example.com',

			expectedSyntaxTags: ['URL'],
		},
	])('$label', async ({ markup, expectedText, expectedSyntaxTags }) => {
		const editor = await createTestEditor(markup, EditorSelection.cursor(0), expectedSyntaxTags, [replaceLinks]);
		expect(editor.contentDOM.textContent).toBe(expectedText);
	});

	it('should not move cursor when URL is already visible', async () => {
		const markup = '[test](https://example.com/)';
		const initialCursor = markup.indexOf('test');
		const clickedCursor = markup.indexOf('example');
		const editor = await createTestEditor(markup, EditorSelection.cursor(initialCursor), ['URL', 'LinkMark', 'Link'], [replaceLinks]);

		expect(editor.contentDOM.textContent).toBe(markup);

		editor.contentDOM.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
		editor.dispatch({ selection: EditorSelection.cursor(clickedCursor) });
		editor.contentDOM.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

		expect(editor.state.selection.main.anchor).toBe(clickedCursor);
	});

	it('should place cursor after link when tapped on mobile', async () => {
		const markup = 'before [link](https://example.com/)';
		const clickedCursor = markup.indexOf('link') + 2;
		const editor = await createTestEditor(markup, EditorSelection.cursor(0), ['URL', 'LinkMark', 'Link'], [replaceLinks]);

		const touchStart = new Event('touchstart', { bubbles: true });
		Object.defineProperty(touchStart, 'targetTouches', { value: [] });
		editor.contentDOM.dispatchEvent(touchStart);
		editor.dispatch({ selection: EditorSelection.cursor(clickedCursor) });
		editor.contentDOM.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(editor.state.selection.main.anchor).toBe(markup.length);
	});

	it('should not move cursor after touch is cancelled', async () => {
		const markup = 'before [link](https://example.com/)';
		const clickedCursor = markup.indexOf('link') + 2;
		const editor = await createTestEditor(markup, EditorSelection.cursor(0), ['URL', 'LinkMark', 'Link'], [replaceLinks]);

		const touchStart = new Event('touchstart', { bubbles: true });
		Object.defineProperty(touchStart, 'targetTouches', { value: [] });
		editor.contentDOM.dispatchEvent(touchStart);
		editor.dispatch({ selection: EditorSelection.cursor(clickedCursor) });

		expect(editor.contentDOM.textContent).toBe('before link');

		editor.contentDOM.ownerDocument.dispatchEvent(new Event('touchcancel'));

		expect(editor.state.selection.main.anchor).toBe(clickedCursor);
		expect(editor.contentDOM.textContent).toBe(markup);
	});

	it('should wait for click after a touch-generated mouseup', async () => {
		const markup = 'before [link](https://example.com/)';
		const clickedCursor = markup.indexOf('link') + 2;
		const editor = await createTestEditor(markup, EditorSelection.cursor(0), ['URL', 'LinkMark', 'Link'], [replaceLinks]);

		const touchStart = new Event('touchstart', { bubbles: true });
		Object.defineProperty(touchStart, 'targetTouches', { value: [] });
		editor.contentDOM.dispatchEvent(touchStart);
		editor.dispatch({ selection: EditorSelection.cursor(clickedCursor) });
		editor.contentDOM.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

		expect(editor.contentDOM.textContent).toBe('before link');
		expect(editor.state.selection.main.anchor).toBe(clickedCursor);

		editor.contentDOM.dispatchEvent(new MouseEvent('click', { bubbles: true }));

		expect(editor.state.selection.main.anchor).toBe(markup.length);
	});

	it('should handle mouse selection after touch ends without click', async () => {
		const markup = 'before [link](https://example.com/)';
		const clickedCursor = markup.indexOf('link') + 2;
		const editor = await createTestEditor(markup, EditorSelection.cursor(0), ['URL', 'LinkMark', 'Link'], [replaceLinks]);

		const touchStart = new Event('touchstart', { bubbles: true });
		Object.defineProperty(touchStart, 'targetTouches', { value: [] });
		editor.contentDOM.dispatchEvent(touchStart);
		editor.contentDOM.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
		editor.contentDOM.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

		const mousePointerDown = new Event('pointerdown', { bubbles: true });
		Object.defineProperty(mousePointerDown, 'pointerType', { value: 'mouse' });
		editor.contentDOM.dispatchEvent(mousePointerDown);
		editor.contentDOM.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
		editor.dispatch({ selection: EditorSelection.cursor(clickedCursor) });
		editor.contentDOM.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

		expect(editor.state.selection.main.anchor).toBe(clickedCursor);
		expect(editor.contentDOM.textContent).toBe(markup);
	});
});
