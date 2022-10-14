import PoorManIntervals from '@joplin/lib/PoorManIntervals';

function debounce(func: (...args: any[])=> void, timeout: number) {
	let timer: number;

	return (...args: any[]) => {
		PoorManIntervals.clearTimeout(timer);
		timer = PoorManIntervals.setTimeout(() => { func.apply(this, args); }, timeout);
	};
}

export default debounce;
