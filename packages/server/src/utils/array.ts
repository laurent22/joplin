/* eslint-disable import/prefer-default-export */

export function unique(array: any[]): any[] {
	return array.filter((elem, index, self) => {
		return index === self.indexOf(elem);
	});
}
