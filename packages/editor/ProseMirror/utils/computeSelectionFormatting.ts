import { MarkType } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import SelectionFormatting, { MutableSelectionFormatting, defaultSelectionFormatting } from '../../SelectionFormatting';
import schema from '../schema';
import { EditorSettings } from '../../types';

const computeSelectionFormatting = (state: EditorState, settings: EditorSettings): SelectionFormatting => {
	const doc = state.doc;
	const selection = state.selection;
	const formatting: MutableSelectionFormatting = {
		...defaultSelectionFormatting,
		selectedText: doc.textBetween(selection.from, selection.to),
		spellChecking: settings.spellcheckEnabled,
	};

	doc.nodesBetween(selection.from, selection.to, (node) => {
		if (node.type === schema.nodes.heading) {
			formatting.headerLevel = node.attrs.level;
		}
		if (node.type === schema.nodes.ordered_list) {
			formatting.inOrderedList = true;
			formatting.listLevel ++;
		}
		if (node.type === schema.nodes.bullet_list) {
			formatting.inUnorderedList = true;
			formatting.listLevel ++;
		}
		if (node.type === schema.nodes.task_list) {
			formatting.inChecklist = true;
			formatting.listLevel ++;
		}
		if (node.type === schema.nodes.pre_block) {
			formatting.inCode = true;
		}
		const linkMark = node.marks.find(mark => mark.type === schema.marks.link);
		if (linkMark) {
			formatting.linkData = {
				linkText: node.textContent,
				linkURL: linkMark.attrs.href,
			};
			formatting.inLink = true;
		}
	});

	const hasMark = (type: MarkType) => {
		if (!type) {
			throw new Error(`Type not found in schema: ${type}`);
		}

		// See the corresponding logic in prosemirror-example-setup:
		// https://github.com/ProseMirror/prosemirror-example-setup/blob/8c11be6850604081dceda8f36e08d2426875e19a/src/menu.ts#L58
		//
		// Using state.storedMarks with an empty selection is important to accurately reflect changes made
		// **by the user** to the current marks associated with the cursor.
		if (selection.empty) {
			return !!type.isInSet(state.storedMarks ?? selection.$head.marks());
		} else {
			return doc.rangeHasMark(selection.from, selection.to, type);
		}
	};

	formatting.inCode ||= hasMark(schema.marks.code);
	if (formatting.inCode) {
		formatting.unspellCheckableRegion = true;
	}
	formatting.italicized = hasMark(schema.marks.emphasis);
	formatting.bolded = hasMark(schema.marks.strong);

	if (formatting.unspellCheckableRegion) {
		formatting.spellChecking = false;
	}

	return formatting;
};
export default computeSelectionFormatting;

