import { buildKeymap as buildBaseKeymap } from 'prosemirror-example-setup';
import schema from '../schema';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, chainCommands, exitCode, liftEmptyBlock, newlineInCode } from 'prosemirror-commands';
import { liftListItem, sinkListItem, splitListItem } from 'prosemirror-schema-list';
import commands from '../commands/commands';
import { EditorCommandType } from '../../types';
import { Command, EditorState, TextSelection, Plugin } from 'prosemirror-state';
import splitBlockAs from '../vendor/splitBlockAs';
import canReplaceSelectionWith from '../utils/canReplaceSelectionWith';

const splitBlockAsDefault = splitBlockAs();
const splitBlockAsParagraph = splitBlockAs(() => ({ type: schema.nodes.paragraph }));

const convertDoubleHardBreakToNewParagraph: Command = (state, dispatch) => {
	const { from, to } = state.selection;
	let foundHardBreak = false;
	let hardBreakFrom = -1;
	state.doc.nodesBetween(from - 1, to, (node, pos) => {
		if (node.type === schema.nodes.hard_break) {
			foundHardBreak = true;
			hardBreakFrom = pos;
		}
		return !foundHardBreak;
	});

	if (foundHardBreak) {
		const updatedSelection = TextSelection.create(state.doc, hardBreakFrom, to);
		const tr = state.tr.setSelection(updatedSelection);
		const splitBlockTransaction = splitBlockAsParagraph(updatedSelection, tr) || splitBlockAsDefault(updatedSelection, tr);

		if (splitBlockTransaction && dispatch) {
			dispatch(splitBlockTransaction);
		}

		return !!splitBlockTransaction;
	}

	return false;
};

const listItemTypes = [
	// Apply the list item keymap to all list item types
	// Ref: Default keymap in prosemirror-example-setup.
	schema.nodes.list_item, schema.nodes.task_list_item,
];

const isInEmptyListItem = (state: EditorState) => {
	const anchor = state.selection.$anchor;
	const selectionGrandparent = anchor.node(Math.max(0, anchor.depth - 1));
	const inList = listItemTypes.includes(selectionGrandparent?.type);

	return inList && anchor.parent.content.size === 0;
};

const isInEmptyParagraph = (state: EditorState) => {
	const selectionParent = state.selection.$anchor.parent;
	return state.selection.empty &&
		state.selection.$anchor.parent.type === schema.nodes.paragraph &&
		selectionParent.content.size === 0;
};

// Handle double-hard-break -> paragraph conversion with a Plugin to work around
// a bug on Android. If convertDoubleHardBreakToNewParagraph is handled with the
// main keymap logic (with a keymap() extension), then it's possible for the cursor
// to get stuck in some cases.
// See https://github.com/laurent22/joplin/issues/12960.
const replaceDoubleHardBreaksOnEnter = new Plugin({
	props: {
		handleDOMEvents: {
			keydown: (view, event) => {
				if (event.key === 'Enter') {
					const commandResult = convertDoubleHardBreakToNewParagraph(view.state, view.dispatch);
					if (commandResult) {
						event.preventDefault();
						return true;
					}
				}
				return false;
			},
		},
	},
});

const insertHardBreak: Command = (state, dispatch) => {
	// Avoid adding hard breaks at the beginning of list items
	if (isInEmptyListItem(state)) return false;
	// Avoid adding hard breaks at the beginning of paragraphs -- certain input rules
	// only work when the cursor is at the beginning of a paragraph. If a paragraph
	// starts with a hard break, it may incorrectly appear to the user that the cursor is at the
	// start of a paragraph, leading to unexpected behavior related to input rules.
	if (isInEmptyParagraph(state)) return false;
	if (!canReplaceSelectionWith(state.selection, schema.nodes.hard_break)) return false;

	if (dispatch) {
		const hardBreak = schema.nodes.hard_break.create();

		// Default to inserting a hard break. See https://github.com/ProseMirror/prosemirror-example-setup/blob/8c11be6850604081dceda8f36e08d2426875e19a/src/keymap.ts#L77C26-L77C39
		dispatch(
			state.tr.replaceSelectionWith(hardBreak)
				.scrollIntoView(),
		);
	}
	return true;
};

const keymapExtension = [
	listItemTypes.map(itemType => keymap({
		'Enter': splitListItem(itemType),
		'Mod-[': liftListItem(itemType),
		'Mod-]': sinkListItem(itemType),
	})),
	replaceDoubleHardBreaksOnEnter,
	keymap({
		'Enter': chainCommands(
			newlineInCode,
			exitCode,
			liftEmptyBlock,
			insertHardBreak,
		),
	}),
	keymap({
		'Mod-k': commands[EditorCommandType.EditLink],
		'Mod-i': commands[EditorCommandType.ToggleItalicized],
		'Mod-`': commands[EditorCommandType.ToggleCode],
		'Mod-f': commands[EditorCommandType.ToggleSearch],
	}),
	keymap(buildBaseKeymap(schema)),
	keymap(baseKeymap),
].flat();

export default keymapExtension;
