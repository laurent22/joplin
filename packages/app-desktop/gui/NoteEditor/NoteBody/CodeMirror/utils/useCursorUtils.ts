import markdownUtils from '@joplin/lib/markdownUtils';
import Setting from '@joplin/lib/models/Setting';
export function modifyListLines(lines: string[], num: number, listSymbol: string) {
	const isNotNumbered = num === 1;
	for (let j = 0; j < lines.length; j++) {
		const line = lines[j];
		if (!line && j === lines.length - 1) continue;
		// Only add the list token if it's not already there
		// if it is, remove it
		if (num) {
			const lineNum = markdownUtils.olLineNumber(line);
			if (!lineNum && isNotNumbered) {
				lines[j] = `${num.toString()}. ${line}`;
				num++;
			} else {
				const listToken = markdownUtils.extractListToken(line);
				lines[j] = line.substr(listToken.length, line.length - listToken.length);
			}
		} else {
			if (!line.startsWith(listSymbol)) {
				lines[j] = listSymbol + line;
			} else {
				lines[j] = line.substr(listSymbol.length, line.length - listSymbol.length);
			}
		}
	}
	return lines;
}
// Helper functions that use the cursor
export default function useCursorUtils(CodeMirror: any) {

	CodeMirror.defineExtension('insertAtCursor', function(text: string) {
		// This is also the method to get all cursors
		const ranges = this.listSelections();
		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		this.operation(() => {
			for (let i = 0; i < ranges.length; i++) {
				// anchor is where the selection starts, and head is where it ends
				// this changes based on how the uses makes a selection
				const { anchor, head } = ranges[i];
				// We want the selection that comes first in the document
				let range = anchor;
				if (head.line < anchor.line || (head.line === anchor.line && head.ch < anchor.ch)) {
					range = head;
				}
				this.replaceRange(text, range);
			}
		});
	});

	CodeMirror.defineExtension('getCurrentLine', function() {
		const curs = this.getCursor('anchor');

		return this.getLine(curs.line);
	});

	CodeMirror.defineExtension('getPreviousLine', function() {
		const curs = this.getCursor('anchor');

		if (curs.line > 0) { return this.getLine(curs.line - 1); }
		return '';
	});

	// this updates the body in a way that registers with the undo/redo
	CodeMirror.defineExtension('updateBody', function(newBody: string) {
		const start = { line: this.firstLine(), ch: 0 };
		const last = this.getLine(this.lastLine());
		const end = { line: this.lastLine(), ch: last ? last.length : 0 };

		this.replaceRange(newBody, start, end);
	});

	CodeMirror.defineExtension('wrapSelections', function(string1: string, string2: string) {
		const selectedStrings = this.getSelections();

		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		this.operation(() => {
			for (let i = 0; i < selectedStrings.length; i++) {
				const selected = selectedStrings[i];

				// Remove white space on either side of selection
				const start = selected.search(/[^\s]/);
				const end = selected.search(/[^\s](?=[\s]*$)/);
				const core = selected.substr(start, end - start + 1);

				// If selection can be toggled do that
				if (core.startsWith(string1) && core.endsWith(string2)) {
					const inside = core.substr(string1.length, core.length - string1.length - string2.length);
					selectedStrings[i] = selected.substr(0, start) + inside + selected.substr(end + 1);
				} else {
					selectedStrings[i] = selected.substr(0, start) + string1 + core + string2 + selected.substr(end + 1);
				}
			}
			this.replaceSelections(selectedStrings, 'around');
		});
	});

	CodeMirror.defineExtension('wrapSelectionsByLine', function(string1: string) {
		const selectedStrings = this.getSelections();

		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		this.operation(() => {
			for (let i = 0; i < selectedStrings.length; i++) {
				const selected = selectedStrings[i];

				const num = markdownUtils.olLineNumber(string1);

				const lines = selected.split(/\r?\n/);
				//  Save the newline character to restore it later
				const newLines = selected.match(/\r?\n/);
				modifyListLines(lines, num, string1);
				const newLine = newLines !== null ? newLines[0] : '\n';
				selectedStrings[i] = lines.join(newLine);
			}
			this.replaceSelections(selectedStrings, 'around');
		});
	});

	// params are the oncontextmenu params
	CodeMirror.defineExtension('alignSelection', function(params: any) {
		// The below is a HACK that uses the selectionText from electron and the coordinates of
		// the click to determine what the codemirror selection should be
		const alignStrings = (s1: string, s2: string) => {
			for (let i = 0; i < s1.length; i++) {
				if (s1.substr(i, s2.length) === s2) { return i; }
			}
			return -1;
		};

		// CodeMirror coordsChar doesn't properly scale values when zoomed
		// we need to manually apply the zoom
		const zoomFactor = Setting.value('windowContentZoomFactor') / 100;

		const selectionText = params.selectionText;
		const coords = this.coordsChar({ left: params.x / zoomFactor, top: params.y / zoomFactor });
		const { anchor, head } = this.findWordAt(coords);
		const selectedWord = this.getRange(anchor, head);

		if (selectionText.length > selectedWord.length) {
			const offset = alignStrings(selectionText, selectedWord);
			anchor.ch -= offset;
			head.ch = anchor.ch + selectionText.length;
		} else if (selectionText.length < selectedWord.length) {
			const offset = alignStrings(selectedWord, selectionText);
			anchor.ch += offset;
			head.ch = anchor.ch + selectionText.length;
		}

		this.setSelection(anchor, head);
	});

	//
	//  START of HACK to support contenteditable
	//

	// This is a HACK to enforce proper cursor positioning when using
	// codemirror in contenteditable mode
	// The problem is that chrome collapses trailing whitespace (for wrapped lines)
	// so when codemirror places the cursor after the trailing whitespace, chrome will
	// register that as being the start of the following line.
	//
	// An alternative fix for this would be to disable codemirror handling of Left/Right and Home/End
	// but that breaks multicursor support in codemirror.
	CodeMirror.defineExtension('isAfterTrailingWhitespace', function() {
		const { line, ch } = this.getCursor('head');
		const beforeCursor = this.charCoords({ line: line, ch: ch - 1 });
		const afterCursor = this.charCoords({ line: line, ch: ch });

		const currentLine = this.getLine(line);

		return beforeCursor.top < afterCursor.top && !!currentLine[ch - 1].match(/\s/);
	});

	CodeMirror.commands.goLineRightSmart = function(cm: any) {
		// Only apply the manual cursor adjustments for contenteditable mode
		if (cm.options.inputStyle !== 'contenteditable') {
			cm.execCommand('goLineRight');
			return;
		}

		// This detects the condition where the cursor is visibly placed at the beginning of
		// the current line, but codemirror treats it like it was on the end of the
		// previous line.
		// The fix is to step forward twice, then re-initiate goLineRight
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goColumnRight');
			cm.execCommand('goColumnRight');
			cm.execCommand('goLineRightSmart');
			return;
		}

		cm.execCommand('goLineRight');

		// This detects the situation where the cursor moves to the end of a wrapped line
		// and is placed after a whitespace character.
		// In this situation we step the curso back once to put it on the correct line.
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goCharLeft');
		}
	};

	CodeMirror.commands.goLineUpSmart = function(cm: any) {
		if (cm.options.inputStyle !== 'contenteditable') {
			cm.execCommand('goLineUp');
			return;
		}

		// In this situation the codemirror editor thinks it's a line above where it is.
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goCharLeft');
			cm.execCommand('goLineLeft');
		} else {
			cm.execCommand('goLineUp');
		}
	};

	CodeMirror.commands.goLineDownSmart = function(cm: any) {
		if (cm.options.inputStyle !== 'contenteditable') {
			cm.execCommand('goLineDown');
			return;
		}

		// In this situation the codemirror editor thinks it's a line above where it is.
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goLineRightSmart');
			cm.execCommand('goCharRight');
		} else {
			cm.execCommand('goLineDown');
		}
	};

	//
	//  END of HACK to support contenteditable
	//
}
