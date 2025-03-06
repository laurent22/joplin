import { RefObject } from 'react';

const getWindowCommandPriority = <T extends HTMLElement> (contentContainer: RefObject<T>) => {
	if (!contentContainer.current) return 0;
	const containerDocument = contentContainer.current.getRootNode() as Document;
	if (!containerDocument || !containerDocument.hasFocus()) return 0;

	if (contentContainer.current.contains(containerDocument.activeElement)) {
		return 2;
	}

	// Container document has focus, but not this editor.
	return 1;
};
export default getWindowCommandPriority;
