import { history, undo, redo } from '@codemirror/commands';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import createTestEditor from '../testing/createTestEditor';
import conflictResolutionExtension, { conflictRegions, resolveConflict, restoreConflict, setConflictRegions, ConflictRegionSpec } from './conflictResolutionExtension';

const createEditor = async (initialText: string, regions: ConflictRegionSpec[] = []) => {
	const editor = await createTestEditor(initialText, EditorSelection.cursor(0), [], [
		history(),
		conflictResolutionExtension(),
	]);

	if (regions.length) {
		editor.dispatch({ effects: setConflictRegions.of({ regions, forText: initialText }) });
	}

	return editor;
};

const regionTexts = (editor: EditorView) => {
	return conflictRegions(editor.state).map(region => editor.state.doc.sliceString(region.from, region.to));
};

const decoratedText = (editor: EditorView, className: string) => {
	return [...editor.dom.querySelectorAll(`.${className}`)].map(node => node.textContent);
};

const clickUseThisVersion = (editor: EditorView, index: number) => {
	const buttons = editor.dom.querySelectorAll<HTMLButtonElement>('.cm-conflictUseVersionButton');
	buttons[index].click();
};

describe('conflictResolutionExtension', () => {
	// The note is saved from the editor document, so both resolving and typing
	// must update the document.
	test('should keep the document in sync with resolutions and typing', async () => {
		const editor = await createEditor('remote one\nunchanged\nremote two', [
			{ from: 0, to: 10, localText: 'local one' },
			{ from: 21, to: 31, localText: 'local two' },
		]);

		clickUseThisVersion(editor, 0);
		editor.dispatch({ changes: { from: editor.state.doc.length, insert: '\ntyped' } });

		expect(editor.state.doc.toString()).toBe('local one\nunchanged\nremote two\ntyped');
	});

	test('should install regions that were measured against the current document', async () => {
		const editor = await createEditor('remote one\nunchanged\nremote two', [
			{ from: 0, to: 10, localText: 'local one' },
			{ from: 21, to: 31, localText: 'local two' },
		]);

		expect(regionTexts(editor)).toEqual(['remote one', 'remote two']);
		expect(conflictRegions(editor.state).map(r => r.localText)).toEqual(['local one', 'local two']);
	});

	test('should give each region a distinct id', async () => {
		const editor = await createEditor('one\ntwo', [
			{ from: 0, to: 3, localText: 'ONE' },
			{ from: 4, to: 7, localText: 'TWO' },
		]);

		const ids = conflictRegions(editor.state).map(region => region.id);
		expect(new Set(ids).size).toBe(2);
	});

	test('regions should follow the text when edits are made before them', async () => {
		const editor = await createEditor('remote one\nunchanged\nremote two', [
			{ from: 21, to: 31, localText: 'local two' },
		]);

		editor.dispatch({ changes: { from: 0, insert: 'a longer first line\n' } });

		expect(regionTexts(editor)).toEqual(['remote two']);
	});

	test('should keep text typed at a region edge inside the region', async () => {
		const editor = await createEditor('remote\nend', [
			{ from: 0, to: 6, localText: 'local' },
		]);

		// Typed against the closing edge of the region
		editor.dispatch({ changes: { from: 6, insert: '!' } });

		expect(regionTexts(editor)).toEqual(['remote!']);
	});

	test('should not install regions until the editor holds the document they belong to', async () => {
		const editor = await createEditor('short doc', [
			{ from: 0, to: 5, localText: 'local' },
		]);
		expect(conflictRegions(editor.state)).toHaveLength(1);

		const nextText = 'a completely different and much longer note body';
		editor.dispatch({ effects: setConflictRegions.of({
			regions: [{ from: 32, to: 38, localText: 'their line' }],
			forText: nextText,
		}) });

		// The old regions are gone even though the new ones cannot be installed yet
		expect(conflictRegions(editor.state)).toHaveLength(0);

		editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: nextText } });

		expect(regionTexts(editor)).toEqual(['longer']);
	});

	test('should not throw when the document shrinks under stale regions', async () => {
		const editor = await createEditor('a reasonably long line of text here', [
			{ from: 20, to: 35, localText: 'local' },
		]);

		editor.dispatch({ effects: setConflictRegions.of({ regions: [], forText: null }) });

		expect(() => {
			editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'hi' } });
		}).not.toThrow();
		expect(conflictRegions(editor.state)).toHaveLength(0);
	});

	test('should highlight each conflicting line and the words that differ within it', async () => {
		const editor = await createEditor('the quick red fox\nunchanged line', [
			{ from: 0, to: 17, localText: 'the quick brown fox' },
		]);

		expect(decoratedText(editor, 'cm-conflictRegion')).toEqual(['the quick red fox']);
		expect(decoratedText(editor, 'cm-conflictChangedWord')).toEqual(['red']);
	});

	test('should not highlight anything outside a conflict region', async () => {
		const editor = await createEditor('conflicted line\nplain line', [
			{ from: 0, to: 15, localText: 'different line' },
		]);

		const highlighted = decoratedText(editor, 'cm-conflictRegion').join('');
		expect(highlighted).not.toContain('plain line');
	});

	test('should mark whitespace-only differences as changed words', async () => {
		const editor = await createEditor('one  two', [
			{ from: 0, to: 8, localText: 'one two' },
		]);

		const marked = decoratedText(editor, 'cm-conflictChangedWord');
		expect(marked.some(text => text.includes(' '))).toBe(true);
	});

	test('should remove the highlighting when a region is resolved', async () => {
		const editor = await createEditor('remote line\nother', [
			{ from: 0, to: 11, localText: 'local line' },
		]);
		expect(decoratedText(editor, 'cm-conflictRegion')).toHaveLength(1);

		editor.dispatch({ effects: resolveConflict.of(conflictRegions(editor.state)[0].id) });

		expect(decoratedText(editor, 'cm-conflictRegion')).toHaveLength(0);
		expect(decoratedText(editor, 'cm-conflictChangedWord')).toHaveLength(0);
	});

	test('should show the local version above each conflict with its own word highlights', async () => {
		const editor = await createEditor('the quick red fox\nplain', [
			{ from: 0, to: 17, localText: 'the quick brown fox' },
		]);

		expect(decoratedText(editor, 'cm-conflictLocalVersion-text')).toEqual(['the quick brown fox']);
		expect(decoratedText(editor, 'cm-conflictLocalVersion-changedWord')).toEqual(['brown']);
	});

	test('the local version block should not be part of the document', async () => {
		const editor = await createEditor('remote line', [
			{ from: 0, to: 11, localText: 'local line' },
		]);

		expect(editor.state.doc.toString()).toBe('remote line');
	});

	test('clicking "Use this version" should replace the text and resolve the region', async () => {
		const editor = await createEditor('the quick red fox\nplain', [
			{ from: 0, to: 17, localText: 'the quick brown fox' },
		]);

		const button = editor.dom.querySelector<HTMLButtonElement>('.cm-conflictUseVersionButton');
		button.click();

		expect(editor.state.doc.toString()).toBe('the quick brown fox\nplain');
		expect(conflictRegions(editor.state)).toHaveLength(0);
		expect(editor.dom.querySelectorAll('.cm-conflictLocalVersion')).toHaveLength(0);
	});

	test('resolving one conflict should leave the others alone', async () => {
		const editor = await createEditor('one\ntwo\nthree', [
			{ from: 0, to: 3, localText: 'ONE' },
			{ from: 8, to: 13, localText: 'THREE' },
		]);

		const buttons = editor.dom.querySelectorAll<HTMLButtonElement>('.cm-conflictUseVersionButton');
		expect(buttons).toHaveLength(2);
		buttons[0].click();

		expect(editor.state.doc.toString()).toBe('ONE\ntwo\nthree');
		expect(regionTexts(editor)).toEqual(['three']);
	});

	test('should recompute the word highlights after the user pauses typing', async () => {
		jest.useFakeTimers();
		try {
			const editor = await createEditor('the quick red fox', [
				{ from: 0, to: 17, localText: 'the quick brown fox' },
			]);
			expect(decoratedText(editor, 'cm-conflictChangedWord')).toEqual(['red']);

			editor.dispatch({ changes: { from: 10, to: 13, insert: 'green' } });
			await jest.advanceTimersByTimeAsync(500);

			expect(decoratedText(editor, 'cm-conflictChangedWord')).toEqual(['green']);
		} finally {
			jest.useRealTimers();
		}
	});

	test('should not recompute the highlights until typing stops', async () => {
		jest.useFakeTimers();
		try {
			const editor = await createEditor('the quick red fox', [
				{ from: 0, to: 17, localText: 'the quick brown fox' },
			]);
			expect(decoratedText(editor, 'cm-conflictChangedWord')).toEqual(['red']);

			editor.dispatch({ changes: { from: 4, to: 9, insert: 'slow' } });
			await jest.advanceTimersByTimeAsync(200);
			expect(decoratedText(editor, 'cm-conflictChangedWord')).toEqual(['red']);

			// Each further change restarts the pause, deferring the recompute again
			editor.dispatch({ changes: { from: 0, to: 3, insert: 'a' } });
			await jest.advanceTimersByTimeAsync(200);
			expect(decoratedText(editor, 'cm-conflictChangedWord')).toEqual(['red']);

			await jest.advanceTimersByTimeAsync(500);
			expect(decoratedText(editor, 'cm-conflictChangedWord')).toEqual(['a', 'slow', 'red']);
		} finally {
			jest.useRealTimers();
		}
	});

	test('should settle a region as soon as it matches, without waiting for the pause', async () => {
		jest.useFakeTimers();
		try {
			const editor = await createEditor('remote line\nother', [
				{ from: 0, to: 11, localText: 'local line' },
			]);

			editor.dispatch({ changes: { from: 0, to: 11, insert: 'local line' } });

			expect(conflictRegions(editor.state)).toHaveLength(0);
			expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(0);
		} finally {
			jest.useRealTimers();
		}
	});

	test('should resolve a region edited to match the local version', async () => {
		const editor = await createEditor('remote line\nother', [
			{ from: 0, to: 11, localText: 'local line' },
		]);
		expect(conflictRegions(editor.state)).toHaveLength(1);

		editor.dispatch({ changes: { from: 0, to: 11, insert: 'local line' } });

		expect(conflictRegions(editor.state)).toHaveLength(0);
		expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(0);
		expect(editor.state.doc.toString()).toBe('local line\nother');
	});

	test('should bring a settled region back when the text stops matching again', async () => {
		const editor = await createEditor('remote line\nother', [
			{ from: 0, to: 11, localText: 'local line' },
		]);

		editor.dispatch({ changes: { from: 0, to: 11, insert: 'local line' } });
		expect(conflictRegions(editor.state)).toHaveLength(0);

		editor.dispatch({ changes: { from: 10, insert: ' edited' } });

		expect(regionTexts(editor)).toEqual(['local line edited']);
	});

	test('should leave other regions alone when one is edited to match', async () => {
		const editor = await createEditor('remote one\nremote two', [
			{ from: 0, to: 10, localText: 'local one' },
			{ from: 11, to: 21, localText: 'local two' },
		]);

		editor.dispatch({ changes: { from: 0, to: 10, insert: 'local one' } });

		expect(regionTexts(editor)).toEqual(['remote two']);
	});

	test('undo should restore both the text and the conflict region', async () => {
		const editor = await createEditor('remote line\nother', [
			{ from: 0, to: 11, localText: 'local line' },
		]);

		clickUseThisVersion(editor, 0);
		expect(editor.state.doc.toString()).toBe('local line\nother');
		expect(conflictRegions(editor.state)).toHaveLength(0);

		undo(editor);

		expect(editor.state.doc.toString()).toBe('remote line\nother');
		expect(regionTexts(editor)).toEqual(['remote line']);
		expect(decoratedText(editor, 'cm-conflictLocalVersion-text')).toEqual(['local line']);
	});

	test('redo should resolve the conflict again', async () => {
		const editor = await createEditor('remote line\nother', [
			{ from: 0, to: 11, localText: 'local line' },
		]);

		clickUseThisVersion(editor, 0);
		undo(editor);
		expect(conflictRegions(editor.state)).toHaveLength(1);

		redo(editor);

		expect(editor.state.doc.toString()).toBe('local line\nother');
		expect(conflictRegions(editor.state)).toHaveLength(0);
	});

	test('undo should restore a region to the right place when an earlier one was resolved', async () => {
		const editor = await createEditor('remote one\nremote two', [
			{ from: 0, to: 10, localText: 'a much longer local one' },
			{ from: 11, to: 21, localText: 'local two' },
		]);

		// Resolving the first region makes the text longer, so the second region has
		// to come back at its shifted position rather than its original one
		clickUseThisVersion(editor, 0);
		expect(regionTexts(editor)).toEqual(['remote two']);

		clickUseThisVersion(editor, 0);
		expect(conflictRegions(editor.state)).toHaveLength(0);

		undo(editor);

		expect(regionTexts(editor)).toEqual(['remote two']);
	});

	test('undo should restore a region edited to match the local version', async () => {
		jest.useFakeTimers();
		try {
			const editor = await createEditor('remote line\nother', [
				{ from: 0, to: 11, localText: 'local line' },
			]);

			editor.dispatch({ changes: { from: 0, to: 11, insert: 'local line' } });
			await jest.advanceTimersByTimeAsync(500);
			expect(conflictRegions(editor.state)).toHaveLength(0);

			undo(editor);

			expect(editor.state.doc.toString()).toBe('remote line\nother');
			expect(regionTexts(editor)).toEqual(['remote line']);
		} finally {
			jest.useRealTimers();
		}
	});

	test('should settle a region whose text is deleted outright', async () => {
		const editor = await createEditor('remote one\nremote two', [
			{ from: 0, to: 10, localText: 'local one' },
			{ from: 11, to: 21, localText: 'local two' },
		]);

		editor.dispatch({ changes: { from: 0, to: 10, insert: '' } });

		expect(regionTexts(editor)).toEqual(['remote two']);
		expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(1);
	});

	test('should not report conflicts once the whole document is cleared', async () => {
		const editor = await createEditor('remote one\nremote two', [
			{ from: 0, to: 10, localText: 'local one' },
			{ from: 11, to: 21, localText: 'local two' },
		]);

		editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: '' } });

		expect(conflictRegions(editor.state)).toHaveLength(0);
		expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(0);
	});

	test('should install a region that already matches as settled', async () => {
		const editor = await createEditor('same text\nrest', [
			{ from: 0, to: 9, localText: 'same text' },
		]);

		expect(conflictRegions(editor.state)).toHaveLength(0);
		expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(0);
	});

	test('should ignore regions that reach past the end of the document', async () => {
		const editor = await createEditor('short');

		editor.dispatch({ effects: setConflictRegions.of({
			regions: [
				{ from: 0, to: 999, localText: 'out of range' },
				{ from: 0, to: 5, localText: 'valid' },
			],
			forText: 'short',
		}) });

		expect(conflictRegions(editor.state)).toHaveLength(1);
		expect(() => {
			editor.dispatch({ changes: { from: 0, insert: 'X' } });
		}).not.toThrow();
	});

	test('should not leave hidden conflicts when one change swallows several regions', async () => {
		const editor = await createEditor('remote one\nremote two', [
			{ from: 0, to: 10, localText: 'local one' },
			{ from: 11, to: 21, localText: 'local two' },
		]);

		// Select-all and paste, without the host sending new regions
		editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'pasted replacement' } });

		expect(conflictRegions(editor.state)).toHaveLength(decoratedText(editor, 'cm-conflictLocalVersion').length);
	});

	test('should install the new regions when a note switch replaces the document', async () => {
		const editor = await createEditor('remote one\nremote two', [
			{ from: 0, to: 10, localText: 'local one' },
			{ from: 11, to: 21, localText: 'local two' },
		]);

		const nextText = 'a different note entirely';
		editor.dispatch({ effects: setConflictRegions.of({
			regions: [{ from: 2, to: 11, localText: 'THEIRS' }],
			forText: nextText,
		}) });
		editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: nextText } });

		expect(regionTexts(editor)).toEqual(['different']);
		expect(decoratedText(editor, 'cm-conflictLocalVersion-text')).toEqual(['THEIRS']);
	});

	test.each([
		['reversed', { from: 5, to: 2, localText: 'x' }],
		['negative', { from: -5, to: 3, localText: 'x' }],
		['past the end', { from: 0, to: 999, localText: 'x' }],
	])('should ignore a region with %s bounds', async (_name, region) => {
		const editor = await createEditor('abcdef');

		editor.dispatch({ effects: setConflictRegions.of({ regions: [region], forText: 'abcdef' }) });

		expect(conflictRegions(editor.state)).toHaveLength(0);
		// Bad bounds would otherwise throw the next time positions were mapped
		expect(() => {
			editor.dispatch({ changes: { from: 0, insert: 'Z' } });
		}).not.toThrow();
	});

	test('should keep the last set when regions are sent twice in one transaction', async () => {
		const editor = await createEditor('abcdef');

		editor.dispatch({ effects: [
			setConflictRegions.of({ regions: [{ from: 0, to: 3, localText: 'A' }], forText: 'abcdef' }),
			setConflictRegions.of({ regions: [{ from: 3, to: 6, localText: 'B' }], forText: 'abcdef' }),
		] });

		expect(regionTexts(editor)).toEqual(['def']);
	});

	test('should keep regions pending until the document they expect arrives', async () => {
		const editor = await createEditor('original');

		editor.dispatch({ effects: setConflictRegions.of({
			regions: [{ from: 0, to: 3, localText: 'X' }],
			forText: 'the expected text',
		}) });

		// A different document turns up first, so the regions must stay pending
		editor.dispatch({ changes: { from: 0, to: 8, insert: 'something else entirely' } });
		expect(conflictRegions(editor.state)).toHaveLength(0);

		editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'the expected text' } });
		expect(regionTexts(editor)).toEqual(['the']);
	});

	test('should ignore a click on a button whose region is already resolved', async () => {
		const editor = await createEditor('remote\nrest', [
			{ from: 0, to: 6, localText: 'local' },
		]);

		const button = editor.dom.querySelector<HTMLButtonElement>('.cm-conflictUseVersionButton');
		button.click();
		// The widget is gone but the click handler is still reachable
		button.click();

		expect(editor.state.doc.toString()).toBe('local\nrest');
		expect(conflictRegions(editor.state)).toHaveLength(0);
	});

	test('should track regions that are not currently rendered', async () => {
		const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`);
		const regions = [];
		let position = 0;
		for (const line of lines) {
			regions.push({ from: position, to: position + line.length, localText: line.toUpperCase() });
			position += line.length + 1;
		}
		const editor = await createEditor(lines.join('\n'), regions);
		expect(conflictRegions(editor.state)).toHaveLength(50);

		const last = conflictRegions(editor.state)[49];
		editor.dispatch({ changes: { from: last.from, to: last.to, insert: last.localText } });

		expect(conflictRegions(editor.state)).toHaveLength(49);
	});

	test('should show nothing after being cleared, whatever the document becomes', async () => {
		const editor = await createEditor('remote line\nrest', [
			{ from: 0, to: 11, localText: 'local line' },
		]);
		expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(1);

		// Switching to a note with nothing to resolve
		editor.dispatch({ effects: setConflictRegions.of({ regions: [], forText: null }) });
		editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'an ordinary note' } });

		expect(conflictRegions(editor.state)).toHaveLength(0);
		expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(0);
		expect(decoratedText(editor, 'cm-conflictRegion')).toHaveLength(0);
	});

	test('should highlight text the other version added without showing a widget', async () => {
		const editor = await createEditor('their paragraph\nrest', [
			{ from: 0, to: 15, localText: '', addedByThem: true },
		]);

		// The text is already on screen, so a widget could only be an empty panel
		expect(decoratedText(editor, 'cm-conflictRegion')).toEqual(['their paragraph']);
		expect(decoratedText(editor, 'cm-conflictLocalVersion')).toHaveLength(0);
		expect(conflictRegions(editor.state)).toHaveLength(1);
	});

	test('should resolve text the other version added when it is deleted', async () => {
		const editor = await createEditor('their paragraph\nrest', [
			{ from: 0, to: 15, localText: '', addedByThem: true },
		]);

		editor.dispatch({ changes: { from: 0, to: 15, insert: '' } });

		expect(conflictRegions(editor.state)).toHaveLength(0);
		expect(editor.state.doc.toString()).toBe('\nrest');
	});

	test('should show a widget for text only this version has', async () => {
		const editor = await createEditor('\nrest', [
			{ from: 0, to: 0, localText: 'only in my version' },
		]);

		expect(conflictRegions(editor.state)).toHaveLength(1);
		expect(decoratedText(editor, 'cm-conflictLocalVersion-text')).toEqual(['only in my version']);

		clickUseThisVersion(editor, 0);
		expect(editor.state.doc.toString()).toBe('only in my version\nrest');
		expect(conflictRegions(editor.state)).toHaveLength(0);
	});

	test('should keep the panel unbroken when a line is split inside a region', async () => {
		const editor = await createEditor('first line\nsecond line\ntail', [
			{ from: 0, to: 22, localText: 'mine' },
		]);
		expect(decoratedText(editor, 'cm-conflictIncoming')).toHaveLength(2);

		editor.dispatch({ changes: { from: 5, insert: '\n' } });

		expect(decoratedText(editor, 'cm-conflictIncoming')).toHaveLength(3);
		expect(decoratedText(editor, 'cm-conflictIncoming-first')).toHaveLength(1);
		expect(decoratedText(editor, 'cm-conflictIncoming-last')).toHaveLength(1);
	});

	test('should drop a resolved region and restore it in document order', async () => {
		const editor = await createEditor('one\ntwo\nthree', [
			{ from: 0, to: 3, localText: 'ONE' },
			{ from: 4, to: 7, localText: 'TWO' },
			{ from: 8, to: 13, localText: 'THREE' },
		]);

		const middle = conflictRegions(editor.state)[1];
		editor.dispatch({ effects: resolveConflict.of(middle.id) });
		expect(regionTexts(editor)).toEqual(['one', 'three']);

		editor.dispatch({ effects: restoreConflict.of(middle) });
		expect(regionTexts(editor)).toEqual(['one', 'two', 'three']);
	});
});
