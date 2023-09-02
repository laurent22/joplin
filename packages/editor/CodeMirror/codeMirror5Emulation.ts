import { EditorView } from '@codemirror/view';
import getScrollFraction from './getScrollFraction';
import { CodeMirror } from '@replit/codemirror-vim';

interface ScrollInfo {
	height: number;
	clientHeight: number;
}

interface Marker {
	// 0-based line number (CM6 uses 1-based line numbers)
	line: number;
	ch: number;
}

interface SelectionInfo {
	anchor: Marker;
	head: Marker;
}

// See the CodeMirror 5 docs: https://codemirror.net/5/doc/manual.html
export interface CodeMirror5Emulation {
	getCursor(start?: 'from'|'to'|'start'|'end'|'head'|'anchor'): Marker;
	somethingSelected(): boolean;
	getSelection(): string;

	getSelections(): string[];
	listSelections(): readonly SelectionInfo[];
	replaceSelections(replacements: string[]): void;
	replaceRange(text: string, from: Marker, to: Marker): void;
	wrapSelections(before: string, after: string): void;
	setSelections(ranges: readonly SelectionInfo[]): void;

	getScrollInfo(): ScrollInfo;
	getScrollPercent(): number;

	// CM5 lines are 0-based, unlike CM6 line numbers.
	lineCount(): number;
	getLine(n: number): string;
	lineAtHeight(height: number, mode?: 'local'): number;
	heightAtLine(lineNumber: number, mode?: 'local'): number;
}

class CodeMirror5EmulationImpl extends CodeMirror implements CodeMirror5Emulation {
	public constructor(private editor: EditorView) {
		super(editor);
	}

	// codemirror-vim's adapter doesn't match the CM5 docs -- wrap it.
	public getCursor(mode?: 'head' | 'anchor' | 'from' | 'to'| 'start' | 'end') {
		if (mode === 'from') {
			mode = 'start';
		}
		if (mode === 'to') {
			mode = 'end';
		}

		return super.getCursor(mode);
	}

	public lineAtHeight(height: number, _mode?: 'local') {
		const lineInfo = this.editor.lineBlockAtHeight(height);

		// - 1: Convert to zero-based.
		const lineNumber = this.editor.state.doc.lineAt(lineInfo.to).number - 1;
		return lineNumber;
	}

	public heightAtLine(lineNumber: number, mode?: 'local') {
		// CodeMirror 5 uses 0-based line numbers. CM6 uses 1-based
		// line numbers.
		const doc = this.editor.state.doc;
		const lineInfo = doc.line(Math.min(lineNumber + 1, doc.lines));
		const lineBlock = this.editor.lineBlockAt(lineInfo.from);

		const height = lineBlock.top;
		if (mode === 'local') {
			const editorTop = this.editor.lineBlockAt(0).top;
			return height - editorTop;
		} else {
			return height;
		}
	}

	public getScrollPercent() {
		return getScrollFraction(this.editor);
	}

	// TODO: Currently copied from useCursorUtils.ts.
	// TODO: Reduce code duplication.
	public wrapSelections(string1: string, string2: string) {
		const selectedStrings = this.getSelections();

		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		this.operation(() => {
			for (let i = 0; i < selectedStrings.length; i++) {
				const selected = selectedStrings[i];

				// Remove white space on either side of selection
				const start = selected.search(/[^\s]/);
				const end = selected.search(/[^\s](?=[\s]*$)/);
				const core = selected.substring(start, end - start + 1);

				// If selection can be toggled do that
				if (core.startsWith(string1) && core.endsWith(string2)) {
					const inside = core.substring(string1.length, core.length - string1.length - string2.length);
					selectedStrings[i] = selected.substring(0, start) + inside + selected.substring(end + 1);
				} else {
					selectedStrings[i] = selected.substring(0, start) + string1 + core + string2 + selected.substring(end + 1);
				}
			}
			this.replaceSelections(selectedStrings);
		});
	}
}

const codeMirror5Emulation = (editor: EditorView): CodeMirror5Emulation => {
	const emulation = new CodeMirror5EmulationImpl(editor);

	// Bind all functions to the class so that the result can be used
	// as an object that doesn't depend on `this`.
	// See https://stackoverflow.com/a/52991162
	const result: any = {};

	const addObjectToResult = (object: any) => {
		const prototype = Object.getPrototypeOf(object);
		if (!prototype) {
			return;
		}

		addObjectToResult(prototype);

		for (const key of Object.getOwnPropertyNames(object)) {
			if (typeof object[key] === 'function') {
				result[key] = object[key].bind(emulation);
			} else {
				result[key] = object[key];
			}
		}
	};
	addObjectToResult(emulation);

	return result;
	// return {
	// 	// CM5 emulation
	// 	lineCount: () => {
	// 		return editor.state.doc.lines;
	// 	},
	// 	lineAtHeight: (height, _mode) => {
	// 		const lineInfo = editor.lineBlockAtHeight(height);

	// 		// - 1: Convert to zero-based.
	// 		const lineNumber = editor.state.doc.lineAt(lineInfo.to).number - 1;
	// 		return lineNumber;
	// 	},
	// 	heightAtLine: (lineNumber, mode) => {
	// 		// CodeMirror 5 uses 0-based line numbers. CM6 uses 1-based
	// 		// line numbers.
	// 		const doc = editor.state.doc;
	// 		const lineInfo = doc.line(Math.min(lineNumber + 1, doc.lines));
	// 		const lineBlock = editor.lineBlockAt(lineInfo.from);

	// 		const height = lineBlock.top;
	// 		if (mode === 'local') {
	// 			const editorTop = editor.lineBlockAt(0).top;
	// 			return height - editorTop;
	// 		} else {
	// 			return height;
	// 		}
	// 	},
	// 	getScrollInfo: () => {
	// 		return {
	// 			height: editor.scrollDOM.scrollHeight,
	// 			clientHeight: editor.scrollDOM.clientHeight,
	// 		};
	// 	},
	// 	getScrollPercent: () => {
	// 		return getScrollFraction(editor);
	// 	},

	// 	getSelection: (): string => {
	// 		const mainRange = editor.state.selection.main;
	// 		return editor.state.sliceDoc(mainRange.from, mainRange.to);
	// 	},
	// 	somethingSelected: () => {
	// 		return !editor.state.selection.main.empty;
	// 	},
	// 	listSelections: () => {
	// 		return editor.state.selection.ranges;
	// 	},
	// };
};

export default codeMirror5Emulation;
