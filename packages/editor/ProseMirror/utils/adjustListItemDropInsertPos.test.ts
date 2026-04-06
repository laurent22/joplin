import { Node as ProseMirrorNode, Slice } from 'prosemirror-model';
import { NodeSelection, EditorState } from 'prosemirror-state';
import { dropPoint } from 'prosemirror-transform';
import schema from '../schema';
import adjustListItemDropInsertPos from './adjustListItemDropInsertPos';

const listItemNode = (text: string) => (
	schema.nodes.list_item.create(
		null,
		schema.nodes.paragraph.create(null, schema.text(text)),
	)
);

const makeState = (listType: 'bullet_list' | 'ordered_list') => {
	return EditorState.create({
		schema,
		doc: schema.nodes.doc.create(null, [
			schema.nodes.paragraph.create(null, schema.text('intro')),
			schema.nodes[listType].create(null, [
				listItemNode('one'),
				listItemNode('two'),
			]),
		]),
	});
};

const findListItemPosByText = (doc: ProseMirrorNode, text: string) => {
	let result = -1;
	doc.descendants((node, pos) => {
		if (node.type === schema.nodes.list_item && node.textContent === text) {
			result = pos;
			return false;
		}
		return true;
	});

	if (result < 0) {
		throw new Error(`List item not found: ${text}`);
	}

	return result;
};

const moveSecondItemAboveFirst = (state: EditorState, useAdjustedInsertPos: boolean) => {
	const secondListItemPos = findListItemPosByText(state.doc, 'two');
	const selection = NodeSelection.create(state.doc, secondListItemPos);
	const listBoundaryPos = selection.$from.before(selection.$from.depth);
	const slice = selection.content();
	const insertPos = dropPoint(state.doc, listBoundaryPos, slice);
	if (insertPos === null) {
		throw new Error('Unable to compute drop insertion point.');
	}

	const tr = state.tr;
	selection.replace(tr);

	let mappedInsertPos = tr.mapping.map(insertPos);
	if (useAdjustedInsertPos) {
		mappedInsertPos = adjustListItemDropInsertPos(tr.doc, mappedInsertPos, slice);
	}

	tr.replaceRange(mappedInsertPos, mappedInsertPos, slice);
	return tr.doc;
};

const listItemTexts = (listNode: ProseMirrorNode) => {
	const result: string[] = [];
	listNode.forEach(node => {
		if (node.type === schema.nodes.list_item) {
			result.push(node.textContent);
		}
	});
	return result;
};

describe('adjustListItemDropInsertPos', () => {
	test('keeps dragged bullet list items in a bullet list at list boundary drop positions', () => {
		const state = makeState('bullet_list');
		const unadjusted = moveSecondItemAboveFirst(state, false);
		const adjusted = moveSecondItemAboveFirst(state, true);

		expect(unadjusted.firstChild.type).toBe(schema.nodes.paragraph);
		expect(unadjusted.child(1).type).toBe(schema.nodes.ordered_list);

		expect(adjusted.firstChild.type).toBe(schema.nodes.paragraph);
		expect(adjusted.child(1).type).toBe(schema.nodes.bullet_list);
		expect(listItemTexts(adjusted.child(1))).toStrictEqual(['two', 'one']);
	});

	test('keeps dragged ordered list items in an ordered list at list boundary drop positions', () => {
		const state = makeState('ordered_list');
		const adjusted = moveSecondItemAboveFirst(state, true);

		expect(adjusted.firstChild.type).toBe(schema.nodes.paragraph);
		expect(adjusted.child(1).type).toBe(schema.nodes.ordered_list);
		expect(adjusted.childCount).toBe(2);
		expect(listItemTexts(adjusted.child(1))).toStrictEqual(['two', 'one']);
	});

	test('does not modify insertion positions for non-list-item slices', () => {
		const state = makeState('bullet_list');
		const paragraphSelection = NodeSelection.create(state.doc, 0);
		const slice = paragraphSelection.content();

		expect(slice instanceof Slice).toBe(true);
		expect(adjustListItemDropInsertPos(state.doc, 7, slice)).toBe(7);
	});
});
