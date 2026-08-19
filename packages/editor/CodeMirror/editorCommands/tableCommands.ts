// Table editing commands for the CodeMirror Markdown editor.
// These commands use the syntax tree to detect tables and manipulate them
// using the pure utility functions from tableUtils.ts.

import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { parseTable, serializeTable, addRow, addColumn, deleteRow, deleteColumn } from '../utils/markdown/tableUtils';

// Check if a pipe at position `i` in `text` is unescaped.
// A pipe is escaped if preceded by an odd number of backslashes.
const isUnescapedPipe = (text: string, i: number): boolean => {
	if (text[i] !== '|') return false;
	let backslashes = 0;
	let j = i - 1;
	while (j >= 0 && text[j] === '\\') {
		backslashes++;
		j--;
	}
	return backslashes % 2 === 0;
};

// ---------------------------------------------------------------------------
// Table context detection
// ---------------------------------------------------------------------------

export interface TableRange {
	// Start position of the table in the document
	from: number;
	// End position of the table in the document
	to: number;
	// Raw table text
	text: string;
}

export interface CellLocation {
	// Row index (0 = header, 1+ = body rows)
	row: number;
	// Column index (0-based)
	col: number;
}

// Find the full table range if the cursor is inside a table.
// Walks up the syntax tree to find TableHeader, TableRow, or TableDelimiter,
// then expands to cover the entire table.
export const getTableRangeAtCursor = (state: EditorState): TableRange | null => {
	const pos = state.selection.main.head;
	const tree = syntaxTree(state);
	let node = tree.resolveInner(pos, -1);

	// Walk up to find a table-related node
	while (node) {
		if (node.name === 'Table') break;
		if (node.name === 'TableHeader' || node.name === 'TableRow' || node.name === 'TableDelimiter') {
			// Go to parent Table node
			if (node.parent && node.parent.name === 'Table') {
				node = node.parent;
				break;
			}
		}
		if (!node.parent || node.parent.name === 'Document') return null;
		node = node.parent;
	}

	if (node.name !== 'Table') return null;

	return {
		from: node.from,
		to: node.to,
		text: state.doc.sliceString(node.from, node.to),
	};
};

// Determine which cell (row, col) the cursor is in within a table.
// Row 0 = header row, row 1+ = body rows (skipping the delimiter row).
export const getCellAtCursor = (state: EditorState, tableRange: TableRange): CellLocation | null => {
	const pos = state.selection.main.head;
	const tableText = tableRange.text;
	const lines = tableText.split('\n');

	let currentPos = tableRange.from;
	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const lineStart = currentPos;
		const lineEnd = currentPos + lines[lineIdx].length;

		if (pos >= lineStart && pos <= lineEnd) {
			// Skip the delimiter line (line index 1)
			if (lineIdx === 1) return null;

			// Map lineIdx to row: 0 → header (row 0), 2+ → body (row 1+)
			const row = lineIdx === 0 ? 0 : lineIdx - 1;

			// Find which column the cursor is in by counting unescaped pipes
			const offsetInLine = pos - lineStart;
			const lineText = lines[lineIdx];
			const hasLeadingPipe = lineText.trimStart().startsWith('|');

			// If the line has a leading pipe, cursor before it is col -1 (not in a cell yet).
			// If no leading pipe, cursor starts in col 0 (already in the first cell).
			let col = hasLeadingPipe ? -1 : 0;

			for (let i = 0; i < offsetInLine; i++) {
				if (isUnescapedPipe(lineText, i)) {
					col++;
				}
			}

			if (col < 0) col = 0;

			// Count total columns: number of unescaped pipes + 1 if no leading pipe,
			// or pipes - 1 if there are leading/trailing pipes
			let totalPipes = 0;
			for (let i = 0; i < lineText.length; i++) {
				if (isUnescapedPipe(lineText, i)) {
					totalPipes++;
				}
			}
			const hasTrailingPipe = lineText.trimEnd().endsWith('|');
			let totalCols: number;
			if (hasLeadingPipe && hasTrailingPipe) {
				totalCols = Math.max(1, totalPipes - 1);
			} else if (!hasLeadingPipe && !hasTrailingPipe) {
				totalCols = totalPipes + 1;
			} else {
				totalCols = totalPipes;
			}
			if (col >= totalCols) col = totalCols - 1;

			return { row, col };
		}

		// +1 for the newline character
		currentPos = lineEnd + 1;
	}

	return null;
};

// Find the document offset for the content of a specific cell.
// Returns the position right after the leading space inside the cell.
export const getCellContentPosition = (
	_state: EditorState,
	tableRange: TableRange,
	row: number,
	col: number,
): number | null => {
	const lines = tableRange.text.split('\n');

	// Map row to line index: row 0 → line 0, row 1+ → line (row+1), skipping delimiter
	const lineIdx = row === 0 ? 0 : row + 1;
	if (lineIdx >= lines.length) return null;

	const lineText = lines[lineIdx];
	const hasLeadingPipe = lineText.trimStart().startsWith('|');
	let charIdx = 0;

	if (hasLeadingPipe) {
		// Standard format: | A | B | — find the (col)th pipe and skip past it
		let pipeCount = 0;
		for (; charIdx < lineText.length; charIdx++) {
			if (isUnescapedPipe(lineText, charIdx)) {
				if (pipeCount === col) {
					charIdx++;
					while (charIdx < lineText.length && lineText[charIdx] === ' ') charIdx++;
					break;
				}
				pipeCount++;
			}
		}
	} else {
		// No leading pipe: A | B — cells are separated by pipes
		if (col === 0) {
			// First cell starts at the beginning of the line (skip whitespace)
			while (charIdx < lineText.length && lineText[charIdx] === ' ') charIdx++;
		} else {
			// Find the (col-1)th pipe separator and skip past it
			let pipeCount = 0;
			for (; charIdx < lineText.length; charIdx++) {
				if (isUnescapedPipe(lineText, charIdx)) {
					if (pipeCount === col - 1) {
						charIdx++;
						while (charIdx < lineText.length && lineText[charIdx] === ' ') charIdx++;
						break;
					}
					pipeCount++;
				}
			}
		}
	}

	// Calculate absolute position
	let lineStart = tableRange.from;
	for (let i = 0; i < lineIdx; i++) {
		lineStart += lines[i].length + 1; // +1 for newline
	}

	return lineStart + charIdx;
};

// Get the total number of rows and columns in a table.
const getTableDimensions = (tableRange: TableRange): { rows: number; cols: number } | null => {
	const table = parseTable(tableRange.text);
	if (!table) return null;

	return {
		rows: 1 + table.body.length, // header + body rows
		cols: table.header.cells.length,
	};
};

// ---------------------------------------------------------------------------
// Table editing commands
// ---------------------------------------------------------------------------

// Replace the table text in the document with new table text,
// and move the cursor to the specified cell.
const replaceTableAndMoveCursor = (
	view: EditorView,
	tableRange: TableRange,
	newTableText: string,
	targetRow: number,
	targetCol: number,
): boolean => {
	view.dispatch({
		changes: {
			from: tableRange.from,
			to: tableRange.to,
			insert: newTableText,
		},
	});

	// After dispatching, find the new cell position
	const newRange: TableRange = {
		from: tableRange.from,
		to: tableRange.from + newTableText.length,
		text: newTableText,
	};

	const cellPos = getCellContentPosition(view.state, newRange, targetRow, targetCol);
	if (cellPos !== null) {
		view.dispatch({
			selection: { anchor: cellPos, head: cellPos },
		});
	}

	return true;
};

// Add a row below the current cursor position.
export const tableAddRow = (view: EditorView): boolean => {
	const tableRange = getTableRangeAtCursor(view.state);
	if (!tableRange) return false;

	const table = parseTable(tableRange.text);
	if (!table) return false;

	const cell = getCellAtCursor(view.state, tableRange);
	if (!cell) return false;

	// Determine which body row to insert after
	// row 0 = header → insert at body index 0 (afterIndex = -1)
	// row 1 = first body row → insert after body index 0
	const bodyRowIndex = cell.row === 0 ? -1 : cell.row - 1;
	const newTable = addRow(table, bodyRowIndex);
	const newText = serializeTable(newTable);

	// Move cursor to the new row
	const newRowIndex = cell.row === 0 ? 1 : cell.row + 1;
	return replaceTableAndMoveCursor(view, tableRange, newText, newRowIndex, 0);
};

// Add a column to the right of the current cursor position.
export const tableAddColumn = (view: EditorView): boolean => {
	const tableRange = getTableRangeAtCursor(view.state);
	if (!tableRange) return false;

	const table = parseTable(tableRange.text);
	if (!table) return false;

	const cell = getCellAtCursor(view.state, tableRange);
	if (!cell) return false;

	const newTable = addColumn(table, cell.col);
	const newText = serializeTable(newTable);

	return replaceTableAndMoveCursor(view, tableRange, newText, cell.row, cell.col + 1);
};

// Delete the current row.
// If the cursor is on the header row, the entire table is deleted.
// If deleting the row would leave no body rows, the table is still valid (header only).
export const tableDeleteRow = (view: EditorView): boolean => {
	const tableRange = getTableRangeAtCursor(view.state);
	if (!tableRange) return false;

	const table = parseTable(tableRange.text);
	if (!table) return false;

	const cell = getCellAtCursor(view.state, tableRange);
	if (!cell) return false;

	if (cell.row === 0) {
		// Delete entire table when on header row
		view.dispatch({
			changes: { from: tableRange.from, to: tableRange.to, insert: '' },
		});
		return true;
	}

	const bodyRowIndex = cell.row - 1;
	const newTable = deleteRow(table, bodyRowIndex);
	if (!newTable) return false;

	const newText = serializeTable(newTable);

	// Move cursor to previous row or header
	const newRow = Math.min(cell.row, newTable.body.length);
	return replaceTableAndMoveCursor(view, tableRange, newText, newRow, cell.col);
};

// Delete the current column.
// Returns false (no-op) if it would delete the last column.
export const tableDeleteColumn = (view: EditorView): boolean => {
	const tableRange = getTableRangeAtCursor(view.state);
	if (!tableRange) return false;

	const table = parseTable(tableRange.text);
	if (!table) return false;

	const cell = getCellAtCursor(view.state, tableRange);
	if (!cell) return false;

	const newTable = deleteColumn(table, cell.col);
	if (!newTable) return false;

	const newText = serializeTable(newTable);

	// Move cursor to previous column or stay at same position
	const newCol = Math.min(cell.col, newTable.header.cells.length - 1);
	return replaceTableAndMoveCursor(view, tableRange, newText, cell.row, newCol);
};

// Move the cursor to the next cell (Tab behavior).
// If at the last cell of the last row, add a new row.
export const tableNextCell = (view: EditorView): boolean => {
	const tableRange = getTableRangeAtCursor(view.state);
	if (!tableRange) return false;

	const dims = getTableDimensions(tableRange);
	if (!dims) return false;

	const cell = getCellAtCursor(view.state, tableRange);
	if (!cell) return false;

	let nextRow = cell.row;
	let nextCol = cell.col + 1;

	if (nextCol >= dims.cols) {
		nextCol = 0;
		nextRow++;
	}

	// If we've gone past the last row, add a new row
	if (nextRow >= dims.rows) {
		const table = parseTable(tableRange.text);
		if (!table) return false;

		const newTable = addRow(table, table.body.length - 1);
		const newText = serializeTable(newTable);
		return replaceTableAndMoveCursor(view, tableRange, newText, nextRow, 0);
	}

	// Move cursor to the target cell
	const cellPos = getCellContentPosition(view.state, tableRange, nextRow, nextCol);
	if (cellPos === null) return false;

	view.dispatch({
		selection: { anchor: cellPos, head: cellPos },
	});
	return true;
};

// Move the cursor to the previous cell (Shift+Tab behavior).
export const tablePreviousCell = (view: EditorView): boolean => {
	const tableRange = getTableRangeAtCursor(view.state);
	if (!tableRange) return false;

	const dims = getTableDimensions(tableRange);
	if (!dims) return false;

	const cell = getCellAtCursor(view.state, tableRange);
	if (!cell) return false;

	let prevRow = cell.row;
	let prevCol = cell.col - 1;

	if (prevCol < 0) {
		prevRow--;
		prevCol = dims.cols - 1;
	}

	// Can't go before the first cell of the header
	if (prevRow < 0) return false;

	const cellPos = getCellContentPosition(view.state, tableRange, prevRow, prevCol);
	if (cellPos === null) return false;

	view.dispatch({
		selection: { anchor: cellPos, head: cellPos },
	});
	return true;
};
