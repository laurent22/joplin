import { parseTable, serializeTable, addRow, addColumn, deleteRow, deleteColumn, generateTable, ColumnAlignment } from './tableUtils';

describe('tableUtils', () => {

	// parseTable
	it('should parse a simple 2x2 table', () => {
		const text = [
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n');

		const table = parseTable(text);
		expect(table).not.toBeNull();
		expect(table!.header.cells).toHaveLength(2);
		expect(table!.header.cells[0].content).toBe('A');
		expect(table!.header.cells[1].content).toBe('B');
		expect(table!.body).toHaveLength(1);
		expect(table!.body[0].cells[0].content).toBe('1');
		expect(table!.body[0].cells[1].content).toBe('2');
	});

	it('should parse alignment markers', () => {
		const text = [
			'| Left | Center | Right | None |',
			'|:-----|:------:|------:|------|',
			'| a    | b      | c     | d    |',
		].join('\n');

		const table = parseTable(text);
		expect(table).not.toBeNull();
		expect(table!.alignments[0]).toBe(ColumnAlignment.Left);
		expect(table!.alignments[1]).toBe(ColumnAlignment.Center);
		expect(table!.alignments[2]).toBe(ColumnAlignment.Right);
		expect(table!.alignments[3]).toBe(ColumnAlignment.None);
	});

	it('should parse a table with multiple body rows', () => {
		const text = [
			'| H1 | H2 |',
			'|----|-----|',
			'| a  | b   |',
			'| c  | d   |',
			'| e  | f   |',
		].join('\n');

		const table = parseTable(text);
		expect(table).not.toBeNull();
		expect(table!.body).toHaveLength(3);
	});

	it('should return null for invalid input', () => {
		expect(parseTable('hello world')).toBeNull();
		expect(parseTable('| A |\n| B |')).toBeNull(); // no delimiter
		expect(parseTable('')).toBeNull();
	});

	it('should handle header-only tables (no body rows)', () => {
		const text = [
			'| A | B |',
			'|---|---|',
		].join('\n');

		const table = parseTable(text);
		expect(table).not.toBeNull();
		expect(table!.body).toHaveLength(0);
	});

	it('should normalize rows with fewer cells than header', () => {
		const text = [
			'| A | B | C |',
			'|---|---|---|',
			'| 1 |',
		].join('\n');

		const table = parseTable(text);
		expect(table).not.toBeNull();
		expect(table!.body[0].cells).toHaveLength(3);
		expect(table!.body[0].cells[0].content).toBe('1');
		expect(table!.body[0].cells[1].content).toBe('');
		expect(table!.body[0].cells[2].content).toBe('');
	});

	// serializeTable
	it('should produce valid Markdown output when serializing', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		const result = serializeTable(table!);
		const reparsed = parseTable(result);
		expect(reparsed).not.toBeNull();
		expect(reparsed!.header.cells[0].content).toBe('A');
		expect(reparsed!.header.cells[1].content).toBe('B');
		expect(reparsed!.body[0].cells[0].content).toBe('1');
		expect(reparsed!.body[0].cells[1].content).toBe('2');
	});

	it('should preserve alignment markers when serializing', () => {
		const text = [
			'| Left | Center | Right |',
			'|:-----|:------:|------:|',
			'| a    | b      | c     |',
		].join('\n');

		const table = parseTable(text);
		const result = serializeTable(table!);

		const reparsed = parseTable(result);
		expect(reparsed).not.toBeNull();
		expect(reparsed!.alignments[0]).toBe(ColumnAlignment.Left);
		expect(reparsed!.alignments[1]).toBe(ColumnAlignment.Center);
		expect(reparsed!.alignments[2]).toBe(ColumnAlignment.Right);
	});

	it('should round-trip: parse then serialize preserves content', () => {
		const original = [
			'| Name | Age | City    |',
			'|------|-----|---------|',
			'| Alice | 30  | NYC     |',
			'| Bob   | 25  | London  |',
		].join('\n');

		const table = parseTable(original);
		const serialized = serializeTable(table!);
		const reparsed = parseTable(serialized);

		expect(reparsed).not.toBeNull();
		expect(reparsed!.header.cells[0].content).toBe('Name');
		expect(reparsed!.body[0].cells[0].content).toBe('Alice');
		expect(reparsed!.body[1].cells[2].content).toBe('London');
	});

	it('should pad columns for alignment when serializing', () => {
		const table = parseTable([
			'| A | LongHeader |',
			'|---|---|',
			'| x | y |',
		].join('\n'));

		const result = serializeTable(table!);
		const lines = result.split('\n');
		expect(lines).toHaveLength(3);
		const pipeCount = (s: string) => (s.match(/\|/g) || []).length;
		expect(pipeCount(lines[0])).toBe(pipeCount(lines[1]));
		expect(pipeCount(lines[1])).toBe(pipeCount(lines[2]));
	});

	// addRow
	it('should add a row after the specified index', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
			'| 3 | 4 |',
		].join('\n'));

		const result = addRow(table!, 0);
		expect(result.body).toHaveLength(3);
		expect(result.body[0].cells[0].content).toBe('1');
		expect(result.body[1].cells[0].content).toBe(''); // new row
		expect(result.body[2].cells[0].content).toBe('3');
	});

	it('should add a row at the beginning with afterIndex = -1', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		const result = addRow(table!, -1);
		expect(result.body).toHaveLength(2);
		expect(result.body[0].cells[0].content).toBe(''); // new row
		expect(result.body[1].cells[0].content).toBe('1');
	});

	it('should add a row with correct column count', () => {
		const table = parseTable([
			'| A | B | C |',
			'|---|---|---|',
			'| 1 | 2 | 3 |',
		].join('\n'));

		const result = addRow(table!, 0);
		expect(result.body[1].cells).toHaveLength(3);
	});

	// addColumn
	it('should add a column after the specified index', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		const result = addColumn(table!, 0);
		expect(result.header.cells).toHaveLength(3);
		expect(result.header.cells[0].content).toBe('A');
		expect(result.header.cells[1].content).toBe(''); // new column
		expect(result.header.cells[2].content).toBe('B');
		expect(result.alignments).toHaveLength(3);
		expect(result.body[0].cells).toHaveLength(3);
	});

	it('should add a column at the beginning with afterIndex = -1', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		const result = addColumn(table!, -1);
		expect(result.header.cells[0].content).toBe(''); // new column
		expect(result.header.cells[1].content).toBe('A');
	});

	// deleteRow
	it('should delete the row at the given index', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
			'| 3 | 4 |',
		].join('\n'));

		const result = deleteRow(table!, 0);
		expect(result).not.toBeNull();
		expect(result!.body).toHaveLength(1);
		expect(result!.body[0].cells[0].content).toBe('3');
	});

	it('deleteRow should return null for invalid index', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		expect(deleteRow(table!, -1)).toBeNull();
		expect(deleteRow(table!, 5)).toBeNull();
	});

	it('should allow deleting all body rows (header-only table)', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		const result = deleteRow(table!, 0);
		expect(result).not.toBeNull();
		expect(result!.body).toHaveLength(0);
	});

	// deleteColumn
	it('should delete the column at the given index', () => {
		const table = parseTable([
			'| A | B | C |',
			'|---|---|---|',
			'| 1 | 2 | 3 |',
		].join('\n'));

		const result = deleteColumn(table!, 1);
		expect(result).not.toBeNull();
		expect(result!.header.cells).toHaveLength(2);
		expect(result!.header.cells[0].content).toBe('A');
		expect(result!.header.cells[1].content).toBe('C');
		expect(result!.body[0].cells).toHaveLength(2);
	});

	it('should return null when deleting the last column', () => {
		const table = parseTable([
			'| A |',
			'|---|',
			'| 1 |',
		].join('\n'));

		expect(deleteColumn(table!, 0)).toBeNull();
	});

	it('deleteColumn should return null for invalid index', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		expect(deleteColumn(table!, -1)).toBeNull();
		expect(deleteColumn(table!, 5)).toBeNull();
	});

	// generateTable
	it('should generate a valid table with the specified dimensions', () => {
		const result = generateTable(2, 3);
		const table = parseTable(result);

		expect(table).not.toBeNull();
		expect(table!.header.cells).toHaveLength(3);
		expect(table!.body).toHaveLength(2);
	});

	it('should generate a header-only table with 0 body rows', () => {
		const result = generateTable(0, 2);
		const table = parseTable(result);

		expect(table).not.toBeNull();
		expect(table!.header.cells).toHaveLength(2);
		expect(table!.body).toHaveLength(0);
	});

	it('should reject non-integer dimensions', () => {
		expect(() => generateTable(1.5, 2)).toThrow();
		expect(() => generateTable(2, 2.5)).toThrow();
	});

	it('should reject invalid dimensions', () => {
		expect(() => generateTable(0, 0)).toThrow();
		expect(() => generateTable(-1, 2)).toThrow();
	});

	it('addRow should reject out-of-range afterIndex', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		expect(() => addRow(table!, -2)).toThrow(RangeError);
		expect(() => addRow(table!, 5)).toThrow(RangeError);
	});

	it('addColumn should reject out-of-range afterIndex', () => {
		const table = parseTable([
			'| A | B |',
			'|---|---|',
			'| 1 | 2 |',
		].join('\n'));

		expect(() => addColumn(table!, -2)).toThrow(RangeError);
		expect(() => addColumn(table!, 5)).toThrow(RangeError);
	});
});
