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
