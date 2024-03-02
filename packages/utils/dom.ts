/* eslint-disable import/prefer-default-export */

export const findParentElementByClassName = (element: any, parentClassName: string) => {
	while (element) {
		if (element.classList.contains(parentClassName)) return element;
		element = element.parentElement;
	}
	return null;
};
