// .replaceChildren is not supported in Chromium 83, which is the default for Android 11
// (unless auto-updated from the Google Play store).
HTMLElement.prototype.replaceChildren ??= function(this: HTMLElement, ...nodes: Node[]) {
	while (this.children.length) {
		this.children[0].remove();
	}

	for (const node of nodes) {
		this.appendChild(node);
	}
};


Array.prototype.flat ??= function<A, D extends number = 1>(this: A, depthParam?: D): FlatArray<A, D>[] {
	if (!Array.isArray(this)) throw new Error('Not an array');
	const depth = depthParam ?? 1;

	const result = [] as FlatArray<A, D>[];
	for (let i = 0; i < this.length; i++) {
		if (Array.isArray(this[i]) && depth > 0) {
			result.push(...this[i].flat(depth - 1));
		} else {
			result.push(this[i]);
		}
	}
	return result;
};
