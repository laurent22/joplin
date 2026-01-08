import { Command, EditorState, Transaction } from 'prosemirror-state';
import { EditorCommandType } from '../../types';
import { redo, undo } from 'prosemirror-history';
import { autoJoin, selectAll, setBlockType, toggleMark } from 'prosemirror-commands';
import schema from '../schema';
import { liftListItem, sinkListItem, wrapRangeInList } from 'prosemirror-schema-list';
import { NodeType, Slice } from 'prosemirror-model';
import { getSearchVisible, setSearchVisible } from '../plugins/searchPlugin';
import { findNext, findPrev, replaceAll, replaceNext } from 'prosemirror-search';
import { getEditorApi } from '../plugins/joplinEditorApiPlugin';
import { EditorEventType } from '../../events';
import extractSelectedLinesTo from '../utils/extractSelectedLinesTo';
import { EditorView } from 'prosemirror-view';
import jumpToHash from '../utils/jumpToHash';
import focusEditor from './focusEditor';
import canReplaceSelectionWith from '../utils/canReplaceSelectionWith';
import showCreateEditablePrompt from '../plugins/joplinEditablePlugin/showCreateEditablePrompt';
import getTextBetween from '../utils/getTextBetween';

type Dispatch = (tr: Transaction)=> void;
type ExtendedCommand = (state: EditorState, dispatch: Dispatch, view?: EditorView, options?: string[])=> boolean;

const toggleHeading = (level: number): Command => {
	const enableCommand: Command = (state, dispatch) => {
		const result = extractSelectedLinesTo({
			type: schema.nodes.heading,
			attrs: { level },
		}, state.tr, state.selection);
		if (!result) return false;

		if (dispatch) {
			dispatch(result.transaction);
		}
		return true;
	};
	const resetCommand = setBlockType(schema.nodes.paragraph);

	return (state, dispatch, view) => {
		if (enableCommand(state, dispatch, view)) {
			return true;
		}
		return resetCommand(state, dispatch, view);
	};
};

const toggleList = (type: NodeType): Command => {
	const enableCommand: Command = autoJoin((state, dispatch) => {
		const extractionResult = extractSelectedLinesTo({
			type: schema.nodes.paragraph,
			attrs: {},
		}, state.tr, state.selection);

		let transaction = extractionResult?.transaction;
		if (!transaction) {
			transaction = state.tr;
		}

		const selection = extractionResult?.finalSelection ?? state.selection;
		const range = selection.$from.blockRange(selection.$to);
		const result = wrapRangeInList(transaction, range, type);

		if (dispatch && result) {
			dispatch(transaction);
		}

		return result;
	}, [type.name]);
	const liftCommand = liftListItem(schema.nodes.list_item);

	return (state, dispatch, view) => {
		return enableCommand(state, dispatch, view) || liftCommand(state, dispatch, view);
	};
};

const toggleCode: Command = (state, dispatch, view) => {
	return toggleMark(schema.marks.code)(state, dispatch, view) || setBlockType(schema.nodes.paragraph)(state, dispatch, view);
};

const getSelectedBlock = (state: EditorState) => {
	const blockRange = state.selection.$from.blockRange(state.selection.$to);

	// blockRange can be null in an empty document, or when the selection is after the last
	// block (e.g. the very end of the document). Handle this:
	const contentStart = blockRange ? blockRange.start + 1 : state.selection.from;
	return { blockRange, contentStart };
};

const addTextAtLineStart = (text: string): Command => (state, dispatch) => {
	const { contentStart } = getSelectedBlock(state);
	let transaction = state.tr;
	transaction = transaction.insertText(text, contentStart);

	if (dispatch) dispatch(transaction);

	return true;
};

const removeTextAtLineStart = (pattern: RegExp): Command => (state, dispatch) => {
	const { contentStart, blockRange } = getSelectedBlock(state);
	const text = state.doc.textBetween(contentStart, blockRange.end);
	const match = text.match(pattern);
	if (!match || match.index !== 0) return false;

	const contentEnd = contentStart + match[0].length;
	// Verify that the indexes are correct. This also helps verify that there aren't any
	// non-text nodes (e.g checkboxes) included in the range:
	const actualText = state.doc.textBetween(contentStart, contentEnd);
	if (actualText) {
		const transaction = state.tr.replaceRange(contentStart, contentEnd, Slice.empty);
		if (dispatch) dispatch(transaction);
		return true;
	}
	return false;
};

const listItemTypes = [schema.nodes.list_item, schema.nodes.task_list_item];

const commands: Record<EditorCommandType, ExtendedCommand|null> = {
	[EditorCommandType.Undo]: undo,
	[EditorCommandType.Redo]: redo,
	[EditorCommandType.SelectAll]: selectAll,
	[EditorCommandType.Focus]: focusEditor,
	[EditorCommandType.ToggleBolded]: toggleMark(schema.marks.strong),
	[EditorCommandType.ToggleItalicized]: toggleMark(schema.marks.emphasis),
	[EditorCommandType.ToggleCode]: toggleCode,
	[EditorCommandType.ToggleMath]: (state, dispatch, view) => {
		const inlineNodeType = schema.nodes.joplinEditableInline;
		const blockNodeType = schema.nodes.joplinEditableBlock;
		// If multiple paragraphs are selected, it usually isn't possible to replace them
		// to inline math. Fall back to block math:
		const block = !canReplaceSelectionWith(state.selection, inlineNodeType);
		const nodeType = block ? blockNodeType : inlineNodeType;

		if (canReplaceSelectionWith(state.selection, nodeType)) {
			if (view) {
				const selectedText = getTextBetween(state.doc, state.selection.from, state.selection.to);
				const content = selectedText || '...';
				const blockStart = block ? '$$\n\t' : '$';
				return showCreateEditablePrompt({
					source: block ? `${blockStart}${content}\n$$` : `${blockStart}${content}$`,
					inline: !block,
					cursor: blockStart.length,
				})(state, dispatch, view);
			}
			return true;
		}
		return false;
	},
	[EditorCommandType.ToggleComment]: null,
	[EditorCommandType.DuplicateLine]: null,
	[EditorCommandType.SortSelectedLines]: null,
	[EditorCommandType.ToggleNumberedList]: toggleList(schema.nodes.ordered_list),
	[EditorCommandType.ToggleBulletedList]: toggleList(schema.nodes.bullet_list),
	[EditorCommandType.ToggleCheckList]: toggleList(schema.nodes.task_list),
	[EditorCommandType.ToggleHeading]: toggleHeading(2),
	[EditorCommandType.ToggleHeading1]: toggleHeading(1),
	[EditorCommandType.ToggleHeading2]: toggleHeading(2),
	[EditorCommandType.ToggleHeading3]: toggleHeading(3),
	[EditorCommandType.ToggleHeading4]: toggleHeading(4),
	[EditorCommandType.ToggleHeading5]: toggleHeading(5),
	[EditorCommandType.InsertHorizontalRule]: null,
	[EditorCommandType.InsertTable]: (state, dispatch, view) => {
		if (view) {
			// See https://github.com/ProseMirror/prosemirror-tables/issues/91
			const tr = state.tr.replaceSelectionWith(
				schema.nodes.table.create(null, [
					schema.nodes.table_row.create(null, [
						schema.nodes.table_header.createAndFill(),
						schema.nodes.table_header.createAndFill(),
					]),
					schema.nodes.table_row.create(null, [
						schema.nodes.table_cell.createAndFill(),
						schema.nodes.table_cell.createAndFill(),
					]),
				]),
			);

			if (dispatch) {
				dispatch(tr);
			}
		}

		return true;
	},
	[EditorCommandType.InsertCodeBlock]: (state, dispatch, view) => {
		const sourceBlockStart = '```\n';
		const selectedText = getTextBetween(state.doc, state.selection.from, state.selection.to);
		return showCreateEditablePrompt({
			source: `${sourceBlockStart}${selectedText}\n\`\`\``,
			inline: false,
			cursor: sourceBlockStart.length,
		})(state, dispatch, view);
	},
	[EditorCommandType.ToggleSearch]: (state, dispatch, view) => {
		const command = setSearchVisible(!getSearchVisible(state));
		return command(state, dispatch, view);
	},
	[EditorCommandType.ShowSearch]: setSearchVisible(true),
	[EditorCommandType.HideSearch]: setSearchVisible(false),
	[EditorCommandType.FindNext]: findNext,
	[EditorCommandType.FindPrevious]: findPrev,
	[EditorCommandType.ReplaceNext]: replaceNext,
	[EditorCommandType.ReplaceAll]: replaceAll,
	[EditorCommandType.EditLink]: (state: EditorState, dispatch) => {
		if (dispatch) {
			const onEvent = getEditorApi(state).onEvent;
			onEvent({
				kind: EditorEventType.EditLink,
			});
		}

		return true;
	},
	[EditorCommandType.ScrollSelectionIntoView]: (state, dispatch) => {
		if (dispatch) {
			dispatch(state.tr.scrollIntoView());
		}
		return true;
	},
	[EditorCommandType.DeleteLine]: (state, dispatch) => {
		const anchor = state.selection.$anchor;
		const transaction = state.tr;
		for (let i = anchor.depth; i > 0; i--) {
			if (anchor.node(i).isBlock) {
				const deleteFrom = anchor.before(i);
				const deleteTo = anchor.after(i);
				if (dispatch) {
					dispatch(transaction.deleteRange(deleteFrom, deleteTo));
				}
				return true;
			}
		}

		return false;
	},
	[EditorCommandType.DeleteToLineEnd]: null,
	[EditorCommandType.DeleteToLineStart]: null,
	[EditorCommandType.IndentMore]: (state, dispatch, view) => {
		return listItemTypes.some(type => sinkListItem(type)(state, dispatch, view))
			|| addTextAtLineStart('    ')(state, dispatch, view);
	},
	[EditorCommandType.IndentLess]: (state, dispatch, view) => {
		return removeTextAtLineStart(/\s{1,4}/)(state, dispatch, view)
			|| listItemTypes.some(type => liftListItem(type)(state, dispatch, view));
	},
	[EditorCommandType.IndentAuto]: null,
	[EditorCommandType.InsertNewlineAndIndent]: null,
	[EditorCommandType.SwapLineUp]: null,
	[EditorCommandType.SwapLineDown]: null,
	[EditorCommandType.GoDocEnd]: null,
	[EditorCommandType.GoDocStart]: null,
	[EditorCommandType.GoLineStart]: null,
	[EditorCommandType.GoLineEnd]: null,
	[EditorCommandType.GoLineUp]: null,
	[EditorCommandType.GoLineDown]: null,
	[EditorCommandType.GoPageUp]: null,
	[EditorCommandType.GoPageDown]: null,
	[EditorCommandType.GoCharLeft]: null,
	[EditorCommandType.GoCharRight]: null,
	[EditorCommandType.UndoSelection]: null,
	[EditorCommandType.RedoSelection]: null,
	[EditorCommandType.SelectedText]: null,
	[EditorCommandType.InsertText]: (state, dispatch, _view, [text]) => {
		if (dispatch) {
			dispatch(state.tr.insertText(text));
		}
		return true;
	},
	[EditorCommandType.ReplaceSelection]: null,
	[EditorCommandType.SetText]: null,
	[EditorCommandType.JumpToHash]: (state, dispatch, view, [targetHash]) => {
		return jumpToHash(targetHash)(state, dispatch, view);
	},
};

export default commands;
