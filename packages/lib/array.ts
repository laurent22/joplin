export function shuffle<T>(array: T[]): T[] {
	array = array.slice();
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
	return array;
}

export function unique<T>(array: T[]): T[] {
	return array.filter((elem, index, self) => {
		return index === self.indexOf(elem);
	});
}
