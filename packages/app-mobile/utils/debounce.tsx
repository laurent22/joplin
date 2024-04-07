import PoorManIntervals from '@joplin/lib/PoorManIntervals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function debounce(func: (...args: any[])=> void, timeout: number) {
	let timer: number;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return (...args: any[]) => {
		PoorManIntervals.clearTimeout(timer);
		timer = PoorManIntervals.setTimeout(() => { func.apply(this, args); }, timeout);
	};
}

export default debounce;
