/* eslint-disable import/prefer-default-export */

export const objectValueFromPath = (o: any, path: string) => {
	const elements = path.split('.');
	let result = { ...o };
	while (elements.length && result) {
		const e = elements.splice(0, 1)[0];
		result = result[e];
	}
	return result;
};
