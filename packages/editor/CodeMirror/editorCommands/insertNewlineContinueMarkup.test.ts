import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testing/createTestEditor';
import pressReleaseKey from '../testing/pressReleaseKey';
import { keymap } from '@codemirror/view';
import insertNewlineContinueMarkup from './insertNewlineContinueMarkup';

describe('insertNewlineContinueMarkup', () => {
	jest.retryTimes(2);

	it.each([
		{ // Should continue bulleted lists
			before: [
				'- Testing',
				'- Test',
			],
			afterEnterPress: [
				'- Testing',
				'- Test',
				'- ',
			],
		},
		{
			// Should continue bulleted lists separated by blank lines
			before: [
				'- Testing',
				'',
				'- Test',
			],
			afterEnterPress: [
				'- Testing',
				'',
				// Note: This is our reason for forking the indentation logic. See
				// https://github.com/laurent22/joplin/issues/10226
				'- Test',
				'- ',
			],
		},
		{
			// Should allow creating non-tight lists
			before: [
				'- Testing',
				'- ',
			],
			afterEnterPress: [
				'- Testing',
				'',
				'- ',
			],
		},
		{ // Should continue nested numbered lists
			before: [
				'- Testing',
				'\t1. Test',
				'\t2. Test 2',
			],
			afterEnterPress: [
				'- Testing',
				'\t1. Test',
				'\t2. Test 2',
				'\t3. ',
			],
		},
		{ // Should continue nested bulleted lists
			before: [
				'- Testing',
				'\t- Test',
				'\t- Test 2',
				'\t- ',
			],
			afterEnterPress: [
				'- Testing',
				'\t- Test',
				'\t- Test 2',
				' ',
				'\t- ',
			],
			afterEnterPressTwice: [
				'- Testing',
				'\t- Test',
				'\t- Test 2',
				' ',
				'- ',
			],
		},
		{ // Should end lists
			before: [
				'- Testing',
				'- Test',
				'- ',
			],
			afterEnterPress: [
				'- Testing',
				'- Test',
				'',
				'- ',
			],
			afterEnterPressTwice: [
				'- Testing',
				'- Test',
				'',
				'',
			],
		},

	])('pressing enter should correctly end or continue lists (case %#)', async ({ before, afterEnterPress, afterEnterPressTwice }) => {
		const initialDocText = before.join('\n');
		const editor = await createTestEditor(
			initialDocText,
			EditorSelection.cursor(initialDocText.length),
			['BulletList'],
			[
				keymap.of([
					{ key: 'Enter', run: insertNewlineContinueMarkup },
				]),
			],
			false,
		);

		const pressEnter = () => {
			pressReleaseKey(editor, { key: 'Enter', code: 'Enter', typesText: '\n' });
		};

		pressEnter();
		expect(editor.state.doc.toString()).toBe(afterEnterPress.join('\n'));

		if (afterEnterPressTwice) {
			pressEnter();
			expect(editor.state.doc.toString()).toBe(afterEnterPressTwice.join('\n'));
		}
	});
});
