export interface PreparedLine {
	text: string;
	isTableRow: boolean;
	comparisonText: string;
}

const fenceMarker = /^\s{0,3}((`{3,})|(~{3,}))/;

const splitCells = (line: string) => {
	const cells: string[] = [];
	let current = '';

	for (let i = 0; i < line.length; i++) {
		if (line[i] === '\\' && i + 1 < line.length) {
			current += line[i] + line[i + 1];
			i++;
		} else if (line[i] === '|') {
			cells.push(current);
			current = '';
		} else {
			current += line[i];
		}
	}
	cells.push(current);

	return cells;
};

const normaliseTableLine = (line: string) => {
	return splitCells(line)
		.map(cell => (/^\s*:?-+:?\s*$/.test(cell) ? cell.replace(/-+/, '-') : cell).trim())
		.join('|');
};

const looksLikeRow = (line: string) => line.trimStart().startsWith('|');

const hasTrailingOuterPipe = (line: string) => /(^|[^\\])(?:\\\\)*\|[ \t]*$/.test(line);

const isDelimiterRow = (line: string) => {
	if (!looksLikeRow(line)) return false;
	const cells = splitCells(line);
	cells.shift();
	if (hasTrailingOuterPipe(line)) cells.pop();
	return cells.length > 0 && cells.every(cell => /^\s*:?-+:?\s*$/.test(cell.trim()));
};

export default (lines: string[]): PreparedLine[] => {
	const isTableRow = new Array<boolean>(lines.length).fill(false);	let fence: { char: string; length: number }|null = null;

	for (let i = 0; i < lines.length; i++) {
		const marker = fenceMarker.exec(lines[i]);
		if (marker) {
			const run = marker[1];
			if (!fence) {
				fence = { char: run[0], length: run.length };
				continue;
			}
			if (run[0] === fence.char && run.length >= fence.length) {
				fence = null;
				continue;
			}
		}
		if (fence || !isDelimiterRow(lines[i])) continue;

		// The header above and every unbroken row below belong to the same table
		isTableRow[i] = true;
		if (i > 0 && looksLikeRow(lines[i - 1])) isTableRow[i - 1] = true;
		for (let j = i + 1; j < lines.length && looksLikeRow(lines[j]); j++) {
			isTableRow[j] = true;
		}
	}

	return lines.map((text, i) => ({
		text,
		isTableRow: isTableRow[i],
		comparisonText: isTableRow[i] ? normaliseTableLine(text) : text,
	}));
};
