/* eslint-disable import/prefer-default-export */

export function msleep(ms: number) {
	return new Promise((resolve: Function) => {
		setTimeout(() => {
			resolve(null);
		}, ms);
	});
}
