// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export function unique(array: any[]): any[] {
	if (array.length < 100) { // O(n^2) branch, but doesn't require creating a Set
		return array.filter((elem, index, self) => {
			return index === self.indexOf(elem);
		});
	} else { // Faster than O(n^2)
		return Array.from(new Set(array));
	}
}

export const randomElement = <T>(array: T[]): T => {
	if (!array || !array.length) return null;
	return array[Math.floor(Math.random() * array.length)];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const removeElement = (array: any[], element: any) => {
	const index = array.indexOf(element);
	if (index < 0) return;
	array.splice(index, 1);
};
