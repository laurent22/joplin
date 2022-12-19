/* eslint-disable import/prefer-default-export */

export const isInsideContainer = (node: any, className: string): boolean => {
	while (node) {
		if (node.classList && node.classList.contains(className)) return true;
		node = node.parentNode;
	}
	return false;
};
