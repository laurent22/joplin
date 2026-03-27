export default function propsHaveChanged(previous: Record<string, unknown> | null | undefined, next: Record<string, unknown> | null | undefined): boolean {
	if (!previous && next) return true;
	if (previous && !next) return true;
	if (!previous && !next) return false;

	if (Object.keys(previous).length !== Object.keys(next).length) return true;

	for (const n in previous) {
		if (previous[n] !== next[n]) {
			return true;
		}
	}

	return false;
}
