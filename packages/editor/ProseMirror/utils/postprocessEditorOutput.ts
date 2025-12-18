import trimEmptyParagraphs from './trimEmptyParagraphs';

const fixResourceUrls = (container: HTMLElement) => {
	const resources = container.querySelectorAll<HTMLImageElement>('img[data-resource-id]');
	for (const resource of resources) {
		const resourceId = resource.getAttribute('data-resource-id');
		resource.src = `:/${resourceId}`;
	}
};

const removeListItemWrapperParagraphs = (container: HTMLElement) => {
	const listItems = container.querySelectorAll<HTMLLIElement>('li');
	for (const item of listItems) {
		trimEmptyParagraphs(item);

		// Replace <li><p>...text...</p></li> with <li>...text...</li>
		if (item.children.length === 1) {
			const firstChild = item.children[0];
			if (firstChild.tagName === 'P') {
				firstChild.replaceWith(...firstChild.childNodes);
			}
		}
	}
};

// Avoids extra newlines from being included in the output Markdown
const removeChecklistItemWrapperParagraphs = (container: HTMLElement) => {
	const listItems = container.querySelectorAll<HTMLLIElement>('li');
	for (const item of listItems) {
		// Is it a checklist item?
		if (item.children.length !== 2) continue;
		const input = item.children[0];
		const content = item.children[1];
		if (input.tagName !== 'INPUT' || content.tagName !== 'DIV') continue;

		trimEmptyParagraphs(content);

		// Replace <li><input/><div><p>...text...</p></div></li> with <li><input/><span>...text...</span></li>
		if (content.children.length === 1) {
			const firstChild = content.children[0];
			if (firstChild.tagName === 'P') {
				const newContent = document.createElement('span');
				newContent.replaceChildren(...firstChild.childNodes);
				content.replaceWith(newContent);
			}
		}
	}
};

const restoreOriginalLinks = (container: HTMLElement) => {
	// Restore HREFs
	const links = container.querySelectorAll<HTMLAnchorElement>('a[href="#"][data-original-href]');
	for (const link of links) {
		link.href = link.getAttribute('data-original-href');
		link.removeAttribute('data-original-href');
	}
};

const removeTableItemExtraPadding = (container: HTMLElement) => {
	const cells = container.querySelectorAll<HTMLTableCellElement>('th, td');
	for (const cell of cells) {
		// Table cells can exist in Markdown without the need for invisible
		// content.
		// Remove single nonbreaking space padding:
		if (cell.textContent === '\u00A0') {
			cell.textContent = '';
		}
	}
};

const postprocessEditorOutput = (node: Node|DocumentFragment) => {
	// By default, if `src` is specified on an image, the browser will try to load the image, even if it isn't added
	// to the DOM. (A similar problem is described here: https://stackoverflow.com/q/62019538).
	// Since :/resourceId isn't a valid image URI, this results in a large number of warnings. As a workaround,
	// move the element to a temporary document before processing:
	const dom = document.implementation.createHTMLDocument();
	node = dom.importNode(node, true);

	let html: HTMLElement;
	if ((node instanceof HTMLElement)) {
		html = node;
	} else {
		const container = document.createElement('div');
		container.appendChild(node);
		html = container;
	}

	fixResourceUrls(html);
	restoreOriginalLinks(html);
	removeListItemWrapperParagraphs(html);
	removeChecklistItemWrapperParagraphs(html);
	removeTableItemExtraPadding(html);

	return html;
};

export default postprocessEditorOutput;
