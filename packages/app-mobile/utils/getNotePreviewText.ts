// Converts a Markdown (or HTML) note body into a short plain-text excerpt suitable
// for display in a note card.
const getNotePreviewText = (body: string, maxLength = 200) => {
	if (!body) return '';

	let text = body
		// Fenced code blocks: keep the content, drop the fences
		.replace(/^\s*(```|~~~).*$/gm, '')
		// Images (including resource links): remove entirely
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		// Links: keep the label
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		// HTML tags
		.replace(/<[^>]+>/g, '')
		// Headings, block quotes
		.replace(/^\s{0,3}(#{1,6}|>)\s?/gm, '')
		// Unordered and ordered list markers, to-do checkboxes
		.replace(/^\s*([-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/gm, '')
		// Horizontal rules
		.replace(/^\s*([-*_]\s*){3,}$/gm, '')
		// Emphasis markers and inline code
		.replace(/(\*\*|__|\*|_|~~|`)/g, '');

	text = text.replace(/\s+/g, ' ').trim();
	if (text.length > maxLength) text = `${text.substring(0, maxLength).trim()}…`;
	return text;
};

export default getNotePreviewText;
