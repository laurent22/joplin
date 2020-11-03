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

				const lines = selected.split(/\r?\n/);
				//  Save the newline character to restore it later
				const newLines = selected.match(/\r?\n/);

				for (let j = 0; j < lines.length; j++) {
					const line = lines[j];
					// Only add the list token if it's not already there
					// if it is, remove it
					if (!line.startsWith(string1)) {
						lines[j] = string1 + line;
					} else {
						lines[j] = line.substr(string1.length, line.length - string1.length);
					}
				}

				const newLine = newLines !== null ? newLines[0] : '\n';
				selectedStrings[i] = lines.join(newLine);
			}
			this.replaceSelections(selectedStrings, 'around');
		});
	});


}
