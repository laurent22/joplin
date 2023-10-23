export function unique(array: any[]): any[] {
	return array.filter((elem, index, self) => {
		return index === self.indexOf(elem);
	});
}

export const randomElement = <T>(array: T[]): T => {
	if (!array || !array.length) return null;
	return array[Math.floor(Math.random() * array.length)];
};

export const removeElement = (array: any[], element: any) => {
	const index = array.indexOf(element);
	if (index < 0) return;
	array.splice(index, 1);
};
