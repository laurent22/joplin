/**
 * @jest-environment jsdom
 */
import { EditorSelection } from '@codemirror/state';
import { ListType } from '../types';
import createEditor from './testUtil/createEditor';
import { toggleList } from './markdownCommands';

import { describe, it, expect } from '@jest/globals';

describe('markdownCommands.bulletedVsChecklist', () => {
	const bulletedListPart = '- Test\n- This is a test.\n- 3\n- 4\n- 5';
	const checklistPart = '- [ ] This is a checklist\n- [ ] with multiple items.\n- [ ] ☑';
	const initialDocText = `${bulletedListPart}\n\n${checklistPart}`;

	it('should remove a checklist following a bulleted list without modifying the bulleted list', async () => {
		const editor = await createEditor(
			initialDocText, EditorSelection.cursor(bulletedListPart.length + 5)
		);

		toggleList(ListType.CheckList)(editor);
		expect(editor.state.doc.toString()).toBe(
			`${bulletedListPart}\n\nThis is a checklist\nwith multiple items.\n☑`
		);
	});

	it('should remove an unordered list following a checklist without modifying the checklist', async () => {
		const editor = await createEditor(
			initialDocText, EditorSelection.cursor(bulletedListPart.length - 5)
		);

		toggleList(ListType.UnorderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			`Test\nThis is a test.\n3\n4\n5\n\n${checklistPart}`
		);
	});

	it('should replace a selection of unordered and task lists with a correctly-numbered list', async () => {
		const editor = await createEditor(
			initialDocText, EditorSelection.range(0, initialDocText.length)
		);

		toggleList(ListType.OrderedList)(editor);
		expect(editor.state.doc.toString()).toBe(
			'1. Test\n2. This is a test.\n3. 3\n4. 4\n5. 5'
            + '\n\n6. This is a checklist\n7. with multiple items.\n8. ☑'
		);
	});
});
