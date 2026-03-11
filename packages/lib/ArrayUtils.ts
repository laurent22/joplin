export const unique = function<T>(array: T[]): T[] {
	return [...new Set(array)];
};

export const removeElement = function<T>(array: T[], element: T): T[] {
	const index = array.indexOf(element);
	if (index < 0) return array;
	const newArray = array.slice();
	newArray.splice(index, 1);
	return newArray;
};

// https://stackoverflow.com/a/10264318/561309
export const binarySearch = function<T>(items: T[], value: T) {
	let startIndex = 0,
		stopIndex = items.length - 1,
		middle = Math.floor((stopIndex + startIndex) / 2);

	while (items[middle] !== value && startIndex < stopIndex) {
		// adjust search area
		if (value < items[middle]) {
			stopIndex = middle - 1;
		} else if (value > items[middle]) {
			startIndex = middle + 1;
		}

		// recalculate middle
		middle = Math.floor((stopIndex + startIndex) / 2);
	}

	// make sure it's the right value
	return items[middle] !== value ? -1 : middle;
};

export const findByKey = function<T, K extends keyof T>(array: T[], key: K, value: T[K]): T | null {
	for (let i = 0; i < array.length; i++) {
		const o = array[i];
		if (typeof o !== 'object') continue;
		if (o[key] === value) return o;
	}
	return null;
};

export const contentEquals = function<T>(array1: T[], array2: T[]) {
	if (array1 === array2) return true;
	if (!array1.length && !array2.length) return true;
	if (array1.length !== array2.length) return false;

	for (let i = 0; i < array1.length; i++) {
		const a1 = array1[i];
		if (array2.indexOf(a1) < 0) return false;
	}

	return true;
};

// Merges multiple overlapping intervals into a single interval
// e.g. [0, 25], [20, 50], [75, 100] --> [0, 50], [75, 100]
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const mergeOverlappingIntervals = function(intervals: any[], limit: number) {
	intervals.sort((a, b) => a[0] - b[0]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const stack: any[] = [];
	if (intervals.length) {
		stack.push(intervals[0]);
		for (let i = 1; i < intervals.length && stack.length < limit; i++) {
			const top = stack[stack.length - 1];
			if (top[1] < intervals[i][0]) {
				stack.push(intervals[i]);
			} else if (top[1] < intervals[i][1]) {
				top[1] = intervals[i][1];
				stack.pop();
				stack.push(top);
			}
		}
	}
	return stack;
};

export const shuffle = function<T>(array: T[]): T[] {
	array = array.slice();
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
	return array;
};

// Used to replace lodash.pull, so that we don't need to import the whole
// package. Uses Set for O(N) performance.
export const pull = <T>(array: T[], ...elements: T[]): T[] => {
	const removeSet = new Set(elements);
	const output: T[] = [];
	for (const e of array) {
		if (removeSet.has(e)) continue;
		output.push(e);
	}
	return output;
};
