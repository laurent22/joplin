
export function flatten<T>(array: (T | T[])[]): T[] {
	return [].concat(...array);
}

export function normalizePlatform(platform: string) {
	return platform.replace(/\//g, '-');
}
