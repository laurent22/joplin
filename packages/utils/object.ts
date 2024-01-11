/* eslint-disable import/prefer-default-export */

export function checkObjectHasProperties(object: any, properties: string[]) {
	for (const prop of properties) {
		if (!(prop in object)) throw new Error(`Missing property "${prop}": ${JSON.stringify(object)}`);
	}
}
