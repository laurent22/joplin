import CodeMirror5Emulation from './CodeMirror5Emulation';
import { EditorView } from '@codemirror/view';

const makeCodeMirrorEmulation = (initialDocText: string) => {
	const editorView = new EditorView({
		doc: initialDocText,
	});
	return new CodeMirror5Emulation(editorView, ()=>{});
};

describe('CodeMirror5Emulation', () => {
	it('getSearchCursor should support searching for strings', () => {
		const codeMirror = makeCodeMirrorEmulation('testing --- this is a test.');

		// Should find two matches for "test"
		// Note that the CodeMirror documentation specifies that a search cursor
		// should return a boolean when calling findNext/findPrevious. However,
		// the codemirror-vim adapter returns just a truthy/falsy value.
		const testCursor = codeMirror.getSearchCursor('test');
		expect(testCursor.findNext()).toBeTruthy();
		expect(testCursor.findNext()).toBeTruthy();

		// Replace the second match
		testCursor.replace('passing test');
		expect(codeMirror.getValue()).toBe('testing --- this is a passing test.');

		// Should also be able to find previous matches
		expect(testCursor.findPrevious()).toBeTruthy();

		// Should return a falsy value when attempting to search past the end of
		// the document.
		expect(testCursor.findPrevious()).toBeFalsy();
	});

	it('should fire update/change events on change', async () => {
		const codeMirror = makeCodeMirrorEmulation('testing --- this is a test.');

		const updateCallback = jest.fn();
		const changeCallback = jest.fn();
		codeMirror.on('update', updateCallback);
		codeMirror.on('change', changeCallback);

		expect(updateCallback).not.toHaveBeenCalled();
		expect(changeCallback).not.toHaveBeenCalled();

		jest.useFakeTimers();

		// Inserting text should trigger the update and change events
		codeMirror.editor.dispatch({
			changes: { from: 0, to: 1, insert: 'Test: ' },
		});

		// Advance timers -- there may be a delay between the CM 6 event
		// and the dispatched CM 5 event.
		await jest.advanceTimersByTimeAsync(100);

		expect(updateCallback).toHaveBeenCalled();
		expect(changeCallback).toHaveBeenCalled();

		// The change callback should be given two arguments:
		// - the CodeMirror emulation object
		// - a description of the changes
		expect(changeCallback.mock.lastCall[0]).toBe(codeMirror);
		expect(changeCallback.mock.lastCall[1]).toMatchObject({
			from: { line: 0, ch: 0 },
			to: { line: 0, ch: 1 },

			// Arrays of lines
			text: ['Test: '],
			removed: ['t'],
		});
	});

	it('defineOption should fire the option\'s update callback on change', () => {
		const codeMirror = makeCodeMirrorEmulation('Test 1\nTest 2');

		const onOptionUpdate = jest.fn();
		codeMirror.defineOption('an-option!', 'test', onOptionUpdate);

		const onOtherOptionUpdate = jest.fn();
		codeMirror.defineOption('an-option 2', 1, onOtherOptionUpdate);


		// onUpdate should be called once initially
		expect(onOtherOptionUpdate).toHaveBeenCalledTimes(1);
		expect(onOptionUpdate).toHaveBeenCalledTimes(1);
		expect(onOptionUpdate).toHaveBeenLastCalledWith(
			codeMirror,

			// default value -- the new value
			'test',

			// the original value (none, so given CodeMirror.Init)
			codeMirror.Init,
		);

		// onUpdate should be called each time the option changes
		codeMirror.setOption('an-option!', 'test 2');
		expect(onOptionUpdate).toHaveBeenCalledTimes(2);
		expect(onOptionUpdate).toHaveBeenLastCalledWith(
			codeMirror, 'test 2', 'test',
		);

		codeMirror.setOption('an-option!', 'test...');
		expect(onOptionUpdate).toHaveBeenCalledTimes(3);

		// The other update callback should not have been triggered
		// additional times if its option hasn't updated.
		expect(onOtherOptionUpdate).toHaveBeenCalledTimes(1);
	});

	it('should support running commands registered with defineExtension', () => {
		const codeMirror = makeCodeMirrorEmulation('Test 1\nTest 2');

		const testExtension = jest.fn((a: number) => `testing${a}`);
		codeMirror.defineExtension('testExtension', testExtension);

		expect(codeMirror.commandExists('testExtension')).toBe(true);
		expect(codeMirror.execCommand('testExtension', 1)).toBe('testing1');
	});

	it('markText decorations should be removable', () => {
		const codeMirror = makeCodeMirrorEmulation('Test 1\nTest 2');

		const markDecoration = codeMirror.markText(
			{ line: 0, ch: 0 },
			{ line: 0, ch: 6 },
			{ className: 'test-mark-decoration' },
		);

		const markDecoration2 = codeMirror.markText(
			{ line: 1, ch: 0 },
			{ line: 1, ch: 1 },
			{ className: 'test-decoration-2' },
		);

		const editorDom = codeMirror.cm6.dom;
		expect(editorDom.querySelectorAll('.test-mark-decoration')).toHaveLength(1);
		expect(editorDom.querySelectorAll('.test-decoration-2')).toHaveLength(1);

		codeMirror.setCursor(0, 2);
		codeMirror.replaceSelection('!Test!');

		// Editing the document shouldn't remove the mark
		expect(codeMirror.editor.state.doc.toString()).toBe('Te!Test!st 1\nTest 2');
		expect(editorDom.querySelectorAll('.test-mark-decoration')).toHaveLength(1);

		// Clearing should remove only the decoration that was cleared.
		markDecoration.clear();
		expect(editorDom.querySelectorAll('.test-mark-decoration')).toHaveLength(0);
		expect(editorDom.querySelectorAll('.test-decoration-2')).toHaveLength(1);

		markDecoration2.clear();
		expect(editorDom.querySelectorAll('.test-decoration-2')).toHaveLength(0);
	});

	it('defineExtension should override previous extensions with the same name', () => {
		const codeMirror = makeCodeMirrorEmulation('Test...');
		const testExtensionFn1 = jest.fn();
		const testExtensionFn2 = jest.fn();

		codeMirror.defineExtension('defineExtensionShouldOverride', testExtensionFn1);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(codeMirror as any).defineExtensionShouldOverride();
		expect(testExtensionFn1).toHaveBeenCalledTimes(1);
		expect(testExtensionFn2).toHaveBeenCalledTimes(0);

		codeMirror.defineExtension('defineExtensionShouldOverride', testExtensionFn2);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		(codeMirror as any).defineExtensionShouldOverride();
		expect(testExtensionFn1).toHaveBeenCalledTimes(1);
		expect(testExtensionFn2).toHaveBeenCalledTimes(1);
	});

	it('defineExtension should register an extension where this points to the editor', () => {
		const codeMirror = makeCodeMirrorEmulation('Test...');
		let lastThis = null;

		codeMirror.defineExtension('testExtension', function() {
			lastThis = this;
		});
		codeMirror.execCommand('testExtension');

		expect(lastThis).toBe(codeMirror);
	});

	it('.markText should support specifying ranges outside the document', () => {
		const codeMirror = makeCodeMirrorEmulation('Test...');

		const testClassName = 'out-of-range-test-mark';
		codeMirror.markText(
			// In range
			{ line: 0, ch: 4 },
			// Out of range
			{ line: 0, ch: 1002 },
			{ className: testClassName },
		);

		const dom = codeMirror.editor.dom;
		expect(dom.querySelectorAll(`.${testClassName}`)).toHaveLength(1);
	});

	it('.markText should throw when given non-integer boundaries', () => {
		const codeMirror = makeCodeMirrorEmulation('Test...');

		expect(() => codeMirror.markText(
			{ line: 0, ch: 4.2 },
			{ line: 0, ch: 5 },
		)).toThrow(/is not an integer/i);
	});
});
