// Whiteboard cards render into the main document, not the isolated note-viewer
// iframe, so a note's <style> would reach the app chrome. Removing <style>
// elements also drops any @import; inline style="" attributes are kept as they
// only affect the card itself.
const stripUnsafeStyles = (html: string) => {
	if (!html || !/<style/i.test(html)) return html;

	const doc = new DOMParser().parseFromString(html, 'text/html');
	for (const style of Array.from(doc.querySelectorAll('style'))) {
		style.remove();
	}
	return doc.body.innerHTML;
};

export default stripUnsafeStyles;
