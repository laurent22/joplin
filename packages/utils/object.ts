// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const objectValueFromPath = (o: any, path: string) => {
	const elements = path.split('.');
	let result = { ...o };
	while (elements.length && result) {
		const e = elements.splice(0, 1)[0];
		result = result[e];
	}
	return result;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function checkObjectHasProperties(object: any, properties: string[]) {
	for (const prop of properties) {
		if (!(prop in object)) throw new Error(`Missing property "${prop}": ${JSON.stringify(object)}`);
	}
}
