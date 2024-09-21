import { EditorView } from '@codemirror/view';
import { EditorCommandType, ListType } from '../../types';
import { undo, redo, selectAll, indentSelection, cursorDocStart, cursorDocEnd, cursorLineStart, cursorLineEnd, deleteToLineStart, deleteToLineEnd, undoSelection, redoSelection, cursorPageDown, cursorPageUp, cursorCharRight, cursorCharLeft, insertNewlineAndIndent, cursorLineDown, cursorLineUp, toggleComment, deleteLine, moveLineUp, moveLineDown } from '@codemirror/commands';
import {
	decreaseIndent, increaseIndent,
	insertHorizontalRule,
	toggleBolded, toggleCode,
	toggleHeaderLevel, toggleItalicized,
	toggleList, toggleMath,
} from '../markdown/markdownCommands';
import duplicateLine from './duplicateLine';
import sortSelectedLines from './sortSelectedLines';
import { closeSearchPanel, findNext, findPrevious, openSearchPanel, replaceAll, replaceNext } from '@codemirror/search';
import { focus } from '@joplin/lib/utils/focusHandler';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export type EditorCommandFunction = (editor: EditorView, ...args: any[])=> void|any;

const replaceSelectionCommand = (editor: EditorView, toInsert: string) => {
	editor.dispatch(editor.state.replaceSelection(toInsert));
};

const editorCommands: Record<EditorCommandType, EditorCommandFunction> = {
	[EditorCommandType.Undo]: undo,
	[EditorCommandType.Redo]: redo,
	[EditorCommandType.SelectAll]: selectAll,
	[EditorCommandType.Focus]: editor => focus('editorCommands::focus', editor),

	[EditorCommandType.ToggleBolded]: toggleBolded,
	[EditorCommandType.ToggleItalicized]: toggleItalicized,
	[EditorCommandType.ToggleCode]: toggleCode,
	[EditorCommandType.ToggleMath]: toggleMath,
	[EditorCommandType.ToggleComment]: toggleComment,
	[EditorCommandType.DuplicateLine]: duplicateLine,
	[EditorCommandType.SortSelectedLines]: sortSelectedLines,
	[EditorCommandType.ToggleNumberedList]: toggleList(ListType.OrderedList),
	[EditorCommandType.ToggleBulletedList]: toggleList(ListType.UnorderedList),
	[EditorCommandType.ToggleCheckList]: toggleList(ListType.CheckList),
	[EditorCommandType.ToggleHeading]: toggleHeaderLevel(2),
	[EditorCommandType.ToggleHeading1]: toggleHeaderLevel(1),
	[EditorCommandType.ToggleHeading2]: toggleHeaderLevel(2),
	[EditorCommandType.ToggleHeading3]: toggleHeaderLevel(3),
	[EditorCommandType.ToggleHeading4]: toggleHeaderLevel(4),
	[EditorCommandType.ToggleHeading5]: toggleHeaderLevel(5),
	[EditorCommandType.InsertHorizontalRule]: insertHorizontalRule,

	[EditorCommandType.ScrollSelectionIntoView]: editor => {
		editor.dispatch(editor.state.update({
			scrollIntoView: true,
		}));
	},
	[EditorCommandType.DeleteToLineEnd]: deleteToLineEnd,
	[EditorCommandType.DeleteToLineStart]: deleteToLineStart,
	[EditorCommandType.DeleteLine]: deleteLine,
	[EditorCommandType.IndentMore]: increaseIndent,
	[EditorCommandType.IndentLess]: decreaseIndent,
	[EditorCommandType.IndentAuto]: indentSelection,
	[EditorCommandType.InsertNewlineAndIndent]: insertNewlineAndIndent,
	[EditorCommandType.SwapLineUp]: moveLineUp,
	[EditorCommandType.SwapLineDown]: moveLineDown,
	[EditorCommandType.GoDocEnd]: cursorDocEnd,
	[EditorCommandType.GoDocStart]: cursorDocStart,
	[EditorCommandType.GoLineStart]: cursorLineStart,
	[EditorCommandType.GoLineEnd]: cursorLineEnd,
	[EditorCommandType.GoLineUp]: cursorLineUp,
	[EditorCommandType.GoLineDown]: cursorLineDown,
	[EditorCommandType.GoPageUp]: cursorPageUp,
	[EditorCommandType.GoPageDown]: cursorPageDown,
	[EditorCommandType.GoCharLeft]: cursorCharLeft,
	[EditorCommandType.GoCharRight]: cursorCharRight,
	[EditorCommandType.UndoSelection]: undoSelection,
	[EditorCommandType.RedoSelection]: redoSelection,

	[EditorCommandType.ShowSearch]: openSearchPanel,
	[EditorCommandType.HideSearch]: closeSearchPanel,
	[EditorCommandType.FindNext]: findNext,
	[EditorCommandType.FindPrevious]: findPrevious,
	[EditorCommandType.ReplaceNext]: replaceNext,
	[EditorCommandType.ReplaceAll]: replaceAll,

	// Getter commands
	// Note that these commands aren't strictly CodeMirror 6 commands as they produce
	// output.
	[EditorCommandType.SelectedText]: editor => {
		const selection = editor.state.selection;
		return editor.state.sliceDoc(selection.main.from, selection.main.to);
	},
	[EditorCommandType.InsertText]: replaceSelectionCommand,
	[EditorCommandType.ReplaceSelection]: replaceSelectionCommand,

	[EditorCommandType.SetText]: (editor, text: string) => {
		editor.dispatch({
			changes: [{
				from: 0,
				to: editor.state.doc.length,
				insert: text,
			}],
		});
	},
};
export default editorCommands;

