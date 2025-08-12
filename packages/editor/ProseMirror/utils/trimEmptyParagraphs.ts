
const trimEmptyParagraphs = (container: Element) => {
	const firstChild = () => {
		return container.children ? container.children[0] : null;
	};
	const lastChild = () => {
		return container.children ? container.children[container.children.length - 1] : null;
	};
	const removeWhile = (next: ()=> Element, filter: (node: Element)=> boolean) => {
		for (let element = next(); element && filter(element); element = next()) {
			element.remove();
		}
	};

	const isEmptyParagraph = (element: Element)=> {
		return element.tagName === 'P' && element.textContent === '';
	};
	removeWhile(firstChild, isEmptyParagraph);
	removeWhile(lastChild, isEmptyParagraph);
};

export default trimEmptyParagraphs;
