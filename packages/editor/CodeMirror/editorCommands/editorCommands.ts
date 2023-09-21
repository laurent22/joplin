import { EditorView } from '@codemirror/view';
import { EditorCommandType, ListType } from '../../types';
import { undo, redo, selectAll, indentSelection, cursorDocStart, cursorDocEnd, cursorLineStart, cursorLineEnd, deleteToLineStart, deleteToLineEnd, undoSelection, redoSelection, cursorPageDown, cursorPageUp, cursorCharRight, cursorCharLeft, insertNewlineAndIndent, cursorLineDown, cursorLineUp } from '@codemirror/commands';
import {
	decreaseIndent, increaseIndent,
	toggleBolded, toggleCode,
	toggleHeaderLevel, toggleItalicized,
	toggleList, toggleMath,
} from '../markdown/markdownCommands';
import swapLine, { SwapLineDirection } from './swapLine';
import { closeSearchPanel, findNext, findPrevious, openSearchPanel, replaceAll, replaceNext } from '@codemirror/search';

type EditorCommandFunction = (editor: EditorView)=> void;

const editorCommands: Record<EditorCommandType, EditorCommandFunction> = {
	[EditorCommandType.Undo]: undo,
	[EditorCommandType.Redo]: redo,
	[EditorCommandType.SelectAll]: selectAll,
	[EditorCommandType.Focus]: editor => editor.focus(),

	[EditorCommandType.ToggleBolded]: toggleBolded,
	[EditorCommandType.ToggleItalicized]: toggleItalicized,
	[EditorCommandType.ToggleCode]: toggleCode,
	[EditorCommandType.ToggleMath]: toggleMath,
	[EditorCommandType.ToggleNumberedList]: toggleList(ListType.OrderedList),
	[EditorCommandType.ToggleBulletedList]: toggleList(ListType.UnorderedList),
	[EditorCommandType.ToggleCheckList]: toggleList(ListType.CheckList),
	[EditorCommandType.ToggleHeading]: toggleHeaderLevel(2),
	[EditorCommandType.ToggleHeading1]: toggleHeaderLevel(1),
	[EditorCommandType.ToggleHeading2]: toggleHeaderLevel(2),
	[EditorCommandType.ToggleHeading3]: toggleHeaderLevel(3),
	[EditorCommandType.ToggleHeading4]: toggleHeaderLevel(4),
	[EditorCommandType.ToggleHeading5]: toggleHeaderLevel(5),

	[EditorCommandType.ScrollSelectionIntoView]: editor => {
		editor.dispatch(editor.state.update({
			scrollIntoView: true,
		}));
	},
	[EditorCommandType.DeleteToLineEnd]: deleteToLineEnd,
	[EditorCommandType.DeleteToLineStart]: deleteToLineStart,
	[EditorCommandType.IndentMore]: increaseIndent,
	[EditorCommandType.IndentLess]: decreaseIndent,
	[EditorCommandType.IndentAuto]: indentSelection,
	[EditorCommandType.InsertNewlineAndIndent]: insertNewlineAndIndent,
	[EditorCommandType.SwapLineUp]: swapLine(SwapLineDirection.Up),
	[EditorCommandType.SwapLineDown]: swapLine(SwapLineDirection.Down),
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
};
export default editorCommands;

