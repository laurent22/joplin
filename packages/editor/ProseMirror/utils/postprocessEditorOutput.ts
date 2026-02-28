import trimEmptyParagraphs from './trimEmptyParagraphs';

const fixResourceUrls = (container: HTMLElement) => {
	const resources = container.querySelectorAll<HTMLImageElement>('img[data-resource-id]');
	for (const resource of resources) {
		const resourceId = resource.getAttribute('data-resource-id');
		resource.src = `:/${resourceId}`;
	}
};

const unwrapSingleParagraph = (parent: Element) => {
	const firstChild = parent.firstElementChild;
	const paragraphCount = Array.from(parent.children).filter(el => el.tagName === 'P').length;
	if (firstChild?.tagName === 'P' && paragraphCount === 1) {
		firstChild.replaceWith(...firstChild.childNodes);
	}
};

const removeListItemWrapperParagraphs = (container: HTMLElement) => {
	const listItems = container.querySelectorAll<HTMLLIElement>('li');
	for (const item of listItems) {
		trimEmptyParagraphs(item);
		unwrapSingleParagraph(item);
	}
};

const removeChecklistItemWrapperParagraphs = (container: HTMLElement) => {
	const listItems = container.querySelectorAll<HTMLLIElement>('li');
	for (const item of listItems) {
		const input = item.firstElementChild;
		if (input?.tagName !== 'INPUT') continue;
		const content = input.nextElementSibling;
		if (!content || content.tagName !== 'DIV') continue;

		trimEmptyParagraphs(content);

		// Hoist nested sublists out of the <div> so Turndown sees <li>
		// as their direct parent and uses single newlines.
		for (const nested of Array.from(content.querySelectorAll(':scope > ul, :scope > ol'))) {
			content.after(nested);
		}

		// Replace <div><p>text</p></div> with <span>text</span>
		const firstChild = content.firstElementChild;
		const paragraphCount = Array.from(content.children).filter(el => el.tagName === 'P').length;
		if (firstChild?.tagName === 'P' && paragraphCount === 1) {
			const span = document.createElement('span');
			span.replaceChildren(...firstChild.childNodes);
			content.replaceWith(span);
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
