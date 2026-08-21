// Whiteboard cards inject their rendered HTML into the main application
// document, not the isolated note-viewer iframe, so a <style> in the note would
// apply to and exfiltrate from the app chrome. Removing <style> elements also
// drops any @import (only valid inside a stylesheet); inline style="" attributes
// are kept as they can only style the card itself.
const stripUnsafeStyles = (html: string) => {
	if (!html || !html.includes('<style')) return html;

	const doc = new DOMParser().parseFromString(html, 'text/html');
	for (const style of Array.from(doc.querySelectorAll('style'))) {
		style.remove();
	}
	return doc.body.innerHTML;
};

export default stripUnsafeStyles;
