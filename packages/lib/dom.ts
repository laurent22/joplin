/* eslint-disable import/prefer-default-export */

export const isInsideContainer = (node: any, className: string): boolean => {
	while (node) {
		if (node.classList && node.classList.contains(className)) return true;
		node = node.parentNode;
	}
	return false;
};

export const waitForElement = async (parent: any, id: string): Promise<any> => {
	return new Promise((resolve, reject) => {
		const iid = setInterval(() => {
			try {
				const element = parent.getElementById(id);
				if (element) {
					clearInterval(iid);
					resolve(element);
				}
			} catch (error) {
				clearInterval(iid);
				reject(error);
			}
		}, 10);
	});
};
