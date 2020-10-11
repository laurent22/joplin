export default function propsHaveChanged(previous:any, next:any):boolean {
	if (!previous && next) return true;

	if (Object.keys(previous).length !== Object.keys(next).length) return true;

	for (const n in previous) {
		if (previous[n] !== next[n]) {
			return true;
		}
	}

	return false;
}
