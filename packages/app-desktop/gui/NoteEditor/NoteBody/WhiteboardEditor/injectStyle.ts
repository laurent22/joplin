// Joplin's desktop build doesn't run CSS imports through a loader, so we
// inject style sheets at runtime as <style> tags. This helper keeps the
// "create once, key by id, no duplicates" pattern in one place.

const injectStyle = (id: string, css: string) => {
	if (typeof document === 'undefined') return;
	if (document.getElementById(id)) return;
	const el = document.createElement('style');
	el.id = id;
	el.textContent = css;
	document.head.appendChild(el);
};

export default injectStyle;
