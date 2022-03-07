function findElementWithClass(element: any, className: string): any {
	if (element.classList && element.classList.contains(className)) return element;

	for (const child of element.childNodes) {
		const hasClass = findElementWithClass(child, className);
		if (hasClass) return hasClass;
	}

	return null;
}

export const checkTableIsUnderCursor = (cm: any) => {
	if (!cm) return false;

	const coords = cm.cursorCoords(cm.getCursor());
	const element = document.elementFromPoint(coords.left, coords.top);
	if (!element) return false;
	return !!findElementWithClass(element, 'cm-jn-table-item');
};

export const readTableAroundCursor = (cm: any) => {
	const idxAtCursor = cm.doc.getCursor().line;
	const lineCount = cm.lineCount();

	const lines: string[] = [];

	for (let i = idxAtCursor - 1; i >= 0; i--) {
		const line: string = cm.doc.getLine(i);
		if (line.startsWith('|')) {
			lines.splice(0, 0, line);
		} else {
			break;
		}
	}

	lines.push(cm.doc.getLine(idxAtCursor));

	for (let i = idxAtCursor + 1; i < lineCount; i++) {
		const line: string = cm.doc.getLine(i);
		if (line.startsWith('|')) {
			lines.push(line);
		} else {
			break;
		}
	}

	return lines.join('\n');
};
