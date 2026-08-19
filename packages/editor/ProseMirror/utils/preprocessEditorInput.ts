
const getRootNode = (dom: Document) => {
	return dom.querySelector('body > #rendered-md') ?? dom.body ?? dom.getRootNode();
};

// The renderer attaches source map info to individual list items,
// rather than the toplevel list block.
// The markup restoration logic, however, needs this information on
// the toplevel block.
const addListSourceMapInfo = (dom: Document) => {
	const root = getRootNode(dom);

	const lists = [
		...dom.querySelectorAll('ol, ul'),
	].filter(node => node.parentElement === root);

	for (const list of lists) {
		const firstChild = list.children.item(0);
		const lastChild = list.children.item(list.children.length - 1);
		if (!firstChild || !lastChild) continue;
		if (!firstChild.hasAttribute('source-line') || !lastChild.hasAttribute('source-line-end')) continue;

		const firstChildLine = firstChild.getAttribute('source-line');
		const lastChildLine = lastChild.getAttribute('source-line-end');
		list.classList.add('maps-to-line');
		list.setAttribute('source-line', firstChildLine);
		list.setAttribute('source-line-end', lastChildLine);
	}
};

// Uses the renderer's source-line and source-line-end attributes to
// reconstruct the original Markdown for different parts of the given
// DOM.
const addOriginalMarkdownAttributes = (dom: Document, originalMarkup: string) => {
	const lines = originalMarkup.split('\n');

	const root = getRootNode(dom);
	const sourceMappedToplevelElements = [
		...dom.querySelectorAll('.maps-to-line[source-line][source-line-end]'),
	].filter(node => node.parentElement === root);

	let lastEndLine = -1;
	let lastElement: Element = null;
	for (const elem of sourceMappedToplevelElements) {
		const startLine = Number(elem.getAttribute('source-line'));
		// For block elements, the end line is sometimes the start line of the next
		// block (which should be excluded from the current).
		const endLine = Number(elem.getAttribute('source-line-end')) - 1;

		// If the source map of two adjacent nodes overlaps, we can't know which
		// part of which source line corresponds to the element.
		if (startLine <= lastEndLine) {
			lastElement?.removeAttribute('data-original-markup');
			lastElement = null;
			continue;
		}

		const joinedLines = lines.slice(startLine, endLine + 1).join('\n');
		elem.setAttribute('data-original-markup', joinedLines);

		lastEndLine = endLine;
		lastElement = elem;
	}
};

const preprocessEditorInput = (dom: Document, originalMarkup: string) => {
	addListSourceMapInfo(dom);
	addOriginalMarkdownAttributes(dom, originalMarkup);
};

export default preprocessEditorInput;
