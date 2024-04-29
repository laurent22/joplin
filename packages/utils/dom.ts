/* eslint-disable import/prefer-default-export */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const findParentElementByClassName = (element: any, parentClassName: string) => {
	while (element) {
		if (element.classList.contains(parentClassName)) return element;
		element = element.parentElement;
	}
	return null;
};
