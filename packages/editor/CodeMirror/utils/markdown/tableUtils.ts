// Pure utility functions for parsing and manipulating Markdown tables.
// No CodeMirror dependencies — all operations work on plain strings.

export interface TableCell {
	content: string;
}

export interface TableRow {
	cells: TableCell[];
}

export enum ColumnAlignment {
	Left = 'left',
	Right = 'right',
	Center = 'center',
	None = 'none',
}

export interface Table {
	header: TableRow;
	alignments: ColumnAlignment[];
	body: TableRow[];
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

// Split a single table row line into cell contents.
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

// Handles leading/trailing pipes and trims whitespace from each cell.
//
// Example: "| foo | bar |" → ["foo", "bar"]
const splitRow = (line: string): string[] => {
	// Remove leading/trailing pipe and whitespace
	let trimmed = line.trim();
	if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
	if (trimmed.length > 0 && isUnescapedPipe(trimmed, trimmed.length - 1)) {
		trimmed = trimmed.slice(0, -1);
	}

	// Split on unescaped pipes only
	const cells: string[] = [];
	let current = '';
	for (let i = 0; i < trimmed.length; i++) {
		if (isUnescapedPipe(trimmed, i)) {
			cells.push(current.trim());
			current = '';
		} else {
			current += trimmed[i];
		}
	}
	cells.push(current.trim());
	return cells;
};

// Parse a delimiter cell (e.g. "---", ":---", "---:", ":---:") into a ColumnAlignment.
const parseAlignment = (cell: string): ColumnAlignment => {
	const trimmed = cell.trim();
	const left = trimmed.startsWith(':');
	const right = trimmed.endsWith(':');

	if (left && right) return ColumnAlignment.Center;
	if (right) return ColumnAlignment.Right;
	if (left) return ColumnAlignment.Left;
	return ColumnAlignment.None;
};

// Check whether a line looks like a table delimiter row.
// A delimiter row contains only pipes, dashes, colons, and whitespace.
const isDelimiterRow = (line: string): boolean => {
	const trimmed = line.trim();
	// Must contain at least one dash
	if (!trimmed.includes('-')) return false;
	// Must only contain valid delimiter characters
	return /^[|\-:\s]+$/.test(trimmed);
};

// Parse a Markdown table string into a structured Table object.
// Returns null if the text is not a valid Markdown table.
//
// Expected format:
//   | Header1 | Header2 |
//   |---------|---------|
//   | Cell1   | Cell2   |
export const parseTable = (text: string): Table | null => {
	const lines = text.split('\n').filter(line => line.trim().length > 0);

	if (lines.length < 2) return null;

	const headerCells = splitRow(lines[0]);
	if (headerCells.length === 0) return null;

	// Second line must be the delimiter row
	if (!isDelimiterRow(lines[1])) return null;

	const delimiterCells = splitRow(lines[1]);
	if (delimiterCells.length !== headerCells.length) return null;

	const alignments = delimiterCells.map(parseAlignment);

	const header: TableRow = {
		cells: headerCells.map(content => ({ content })),
	};

	const body: TableRow[] = [];
	for (let i = 2; i < lines.length; i++) {
		const cells = splitRow(lines[i]);
		// Pad or trim cells to match header column count
		const normalizedCells: TableCell[] = [];
		for (let j = 0; j < headerCells.length; j++) {
			normalizedCells.push({ content: j < cells.length ? cells[j] : '' });
		}
		body.push({ cells: normalizedCells });
	}

	return { header, alignments, body };
};

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

// Compute the display width of each column based on the widest cell content.
// Minimum width is 3 (for the delimiter "---").
const computeColumnWidths = (table: Table): number[] => {
	const colCount = table.header.cells.length;
	const widths: number[] = new Array(colCount).fill(3);

	for (let col = 0; col < colCount; col++) {
		widths[col] = Math.max(widths[col], table.header.cells[col].content.length);
		for (const row of table.body) {
			if (col < row.cells.length) {
				widths[col] = Math.max(widths[col], row.cells[col].content.length);
			}
		}
	}

	return widths;
};

// Pad a cell's content to the target width based on alignment.
const padCell = (content: string, width: number, alignment: ColumnAlignment): string => {
	const padAmount = width - content.length;
	if (padAmount <= 0) return content;

	switch (alignment) {
	case ColumnAlignment.Right:
		return `${' '.repeat(padAmount)}${content}`;
	case ColumnAlignment.Center: {
		const leftPad = Math.floor(padAmount / 2);
		const rightPad = padAmount - leftPad;
		return `${' '.repeat(leftPad)}${content}${' '.repeat(rightPad)}`;
	}
	default:
		return `${content}${' '.repeat(padAmount)}`;
	}
};

// Build a delimiter string for a column, e.g. "---", ":---", "---:", ":---:"
const buildDelimiter = (width: number, alignment: ColumnAlignment): string => {
	switch (alignment) {
	case ColumnAlignment.Left:
		return `:${'-'.repeat(width - 1)}`;
	case ColumnAlignment.Right:
		return `${'-'.repeat(width - 1)}:`;
	case ColumnAlignment.Center:
		return `:${'-'.repeat(width - 2)}:`;
	default:
		return '-'.repeat(width);
	}
};

// Serialize a row of cells into a Markdown table line.
const serializeRow = (cells: TableCell[], widths: number[], alignments: ColumnAlignment[]): string => {
	const parts = cells.map((cell, i) => {
		return ` ${padCell(cell.content, widths[i], alignments[i])} `;
	});
	return `|${parts.join('|')}|`;
};

// Convert a Table object back into a Markdown table string.
// Columns are padded to align pipes.
export const serializeTable = (table: Table): string => {
	const widths = computeColumnWidths(table);
	const lines: string[] = [];

	// Header row
	lines.push(serializeRow(table.header.cells, widths, table.alignments));

	// Delimiter row
	const delimiterParts = widths.map((w, i) => ` ${buildDelimiter(w, table.alignments[i])} `);
	lines.push(`|${delimiterParts.join('|')}|`);

	// Body rows
	for (const row of table.body) {
		lines.push(serializeRow(row.cells, widths, table.alignments));
	}

	return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Manipulation
// ---------------------------------------------------------------------------

// Create an empty row with the specified number of columns.
const emptyRow = (colCount: number): TableRow => {
	return { cells: new Array(colCount).fill(null).map(() => ({ content: '' })) };
};

const assertAfterIndex = (afterIndex: number, max: number): void => {
	if (!Number.isInteger(afterIndex) || afterIndex < -1 || afterIndex > max) {
		throw new RangeError(`afterIndex must be an integer between -1 and ${max}`);
	}
};

// Insert a new empty row after the given index.
// Use afterIndex = -1 to insert at the beginning of the body.
export const addRow = (table: Table, afterIndex: number): Table => {
	assertAfterIndex(afterIndex, table.body.length - 1);
	const colCount = table.header.cells.length;
	const newBody = [...table.body];
	newBody.splice(afterIndex + 1, 0, emptyRow(colCount));

	return { ...table, body: newBody };
};

// Insert a new empty column after the given index.
// Use afterIndex = -1 to insert at the beginning.
export const addColumn = (table: Table, afterIndex: number): Table => {
	assertAfterIndex(afterIndex, table.header.cells.length - 1);
	const insertAt = afterIndex + 1;
	const emptyCell = (): TableCell => ({ content: '' });

	const newHeader: TableRow = {
		cells: [...table.header.cells],
	};
	newHeader.cells.splice(insertAt, 0, emptyCell());

	const newAlignments = [...table.alignments];
	newAlignments.splice(insertAt, 0, ColumnAlignment.None);

	const newBody = table.body.map(row => {
		const newCells = [...row.cells];
		newCells.splice(insertAt, 0, emptyCell());
		return { cells: newCells };
	});

	return { header: newHeader, alignments: newAlignments, body: newBody };
};

// Delete a row at the given index.
// Returns null if the table would become invalid (no body rows is fine,
// but we need at least a header).
export const deleteRow = (table: Table, rowIndex: number): Table | null => {
	if (rowIndex < 0 || rowIndex >= table.body.length) return null;

	const newBody = table.body.filter((_, i) => i !== rowIndex);
	return { ...table, body: newBody };
};

// Delete a column at the given index.
// Returns null if the table would have zero columns.
export const deleteColumn = (table: Table, colIndex: number): Table | null => {
	const colCount = table.header.cells.length;
	if (colCount <= 1) return null;
	if (colIndex < 0 || colIndex >= colCount) return null;

	const newHeader: TableRow = {
		cells: table.header.cells.filter((_, i) => i !== colIndex),
	};

	const newAlignments = table.alignments.filter((_, i) => i !== colIndex);

	const newBody = table.body.map(row => ({
		cells: row.cells.filter((_, i) => i !== colIndex),
	}));

	return { header: newHeader, alignments: newAlignments, body: newBody };
};

// Swap two body rows. Row indices are 0-based body indices.
export const swapRows = (table: Table, indexA: number, indexB: number): Table | null => {
	if (indexA < 0 || indexA >= table.body.length) return null;
	if (indexB < 0 || indexB >= table.body.length) return null;
	if (indexA === indexB) return table;

	const newBody = [...table.body];
	[newBody[indexA], newBody[indexB]] = [newBody[indexB], newBody[indexA]];

	return { header: table.header, alignments: table.alignments, body: newBody };
};

// Swap two columns by index.
export const swapColumns = (table: Table, indexA: number, indexB: number): Table | null => {
	const colCount = table.header.cells.length;
	if (indexA < 0 || indexA >= colCount) return null;
	if (indexB < 0 || indexB >= colCount) return null;
	if (indexA === indexB) return table;

	const swapInRow = (cells: TableCell[]): TableCell[] => {
		const newCells = [...cells];
		[newCells[indexA], newCells[indexB]] = [newCells[indexB], newCells[indexA]];
		return newCells;
	};

	const newHeader: TableRow = { cells: swapInRow(table.header.cells) };
	const newAlignments = [...table.alignments];
	[newAlignments[indexA], newAlignments[indexB]] = [newAlignments[indexB], newAlignments[indexA]];
	const newBody = table.body.map(row => ({ cells: swapInRow(row.cells) }));

	return { header: newHeader, alignments: newAlignments, body: newBody };
};

// ---------------------------------------------------------------------------
// Table generation
// ---------------------------------------------------------------------------

// Generate a new empty Markdown table with the specified dimensions.
export const generateTable = (rows: number, columns: number): string => {
	if (!Number.isInteger(columns) || columns <= 0) throw new RangeError('columns must be a positive integer');
	if (!Number.isInteger(rows) || rows < 0) throw new RangeError('rows must be a non-negative integer');

	const header: TableRow = {
		cells: new Array(columns).fill(null).map(() => ({ content: '   ' })),
	};
	const alignments = new Array(columns).fill(ColumnAlignment.None);
	const body: TableRow[] = [];
	for (let i = 0; i < rows; i++) {
		body.push(emptyRow(columns));
	}

	return serializeTable({ header, alignments, body });
};
