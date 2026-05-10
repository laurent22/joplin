// Joplin's desktop build doesn't run CSS imports through a loader, so we
// inject style sheets at runtime as <style> tags.
//
// - `injectStyle(id, css)` is a one-shot, idempotent injection.
// - `replaceStyle(id, css)` updates an existing <style> in place — for
//   theme-dependent CSS that needs to change when the theme changes.

const injectStyle = (id: string, css: string) => {
	if (typeof document === 'undefined') return;
	if (document.getElementById(id)) return;
	const el = document.createElement('style');
	el.id = id;
	el.textContent = css;
	document.head.appendChild(el);
};

export const replaceStyle = (id: string, css: string) => {
	if (typeof document === 'undefined') return;
	let el = document.getElementById(id) as HTMLStyleElement | null;
	if (!el) {
		el = document.createElement('style');
		el.id = id;
		document.head.appendChild(el);
	}
	el.textContent = css;
};

export default injectStyle;
