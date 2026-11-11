import PoorManIntervals from '@joplin/lib/PoorManIntervals';

function debounce<Args extends unknown[]>(func: (...args: Args)=> void, timeout: number) {
	let timer: number;

	return (...args: Args) => {
		PoorManIntervals.clearTimeout(timer);
		timer = PoorManIntervals.setTimeout(() => { func.apply(this, args); }, timeout);
	};
}

export default debounce;
