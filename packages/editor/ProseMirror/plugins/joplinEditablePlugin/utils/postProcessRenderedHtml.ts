// If renderedHtml is an HTMLElement, the content is modified in-place.
const postProcessRenderedHtml = <InputType extends string|HTMLElement> (renderedHtml: InputType, isInline: boolean): InputType => {
	let rootElement;
	if (typeof renderedHtml === 'string') {
		const parser = new DOMParser();
		const parsed = parser.parseFromString(
			`<!DOCTYPE html><html><body>${renderedHtml}</body></html>`,
			'text/html',
		);
		rootElement = parsed.body;
	} else {
		rootElement = renderedHtml;
	}

	const replaceChildMatching = (selector: string) => {
		const toReplace = [...rootElement.children].find(
			child => child.matches(selector),
		);
		toReplace?.replaceWith(...toReplace.childNodes);
	};
	// If the original HTML is from .renderToMarkup, it may have a <div> wrapper:
	replaceChildMatching('#rendered-md');

	if (rootElement.children.length === 1 && isInline) {
		replaceChildMatching('p, div');
	}

	// Remove the 'joplin-editable' container if it's the only thing in the content
	// (since this.dom is itself a joplin-editable)
	if (rootElement.children.length === 1) {
		replaceChildMatching('.joplin-editable');
	}

	// Match the input type
	if (typeof renderedHtml === 'string') {
		return rootElement.innerHTML as InputType;
	} else {
		return rootElement as InputType;
	}
};

export default postProcessRenderedHtml;
