// Converts basic Markdown release notes to simple HTML for display.
// Handles headers, bold, list items, and horizontal rules.

export const escapeHtml = (text: string): string => {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
};

export const formatInlineMarkdown = (text: string): string => {
	let escaped = escapeHtml(text);
	// Bold
	escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	// Inline code
	escaped = escaped.replace(/`(.+?)`/g, '<code>$1</code>');
	// Links: [text](url)
	escaped = escaped.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
	return escaped;
};

export const releaseNotesToHtml = (notes: string): string => {
	if (!notes) return '';

	const lines = notes.split('\n');
	const htmlLines: string[] = [];

	for (const line of lines) {
		let trimmed = line.trim();
		if (!trimmed) continue;

		// Horizontal rules
		if (/^(\*\s*\*\s*\*|---+|___+)\s*$/.test(trimmed)) {
			htmlLines.push('<hr/>');
			continue;
		}

		// Headers
		const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
		if (headerMatch) {
			const level = headerMatch[1].length;
			const text = escapeHtml(headerMatch[2]);
			htmlLines.push(`<h${level}>${text}</h${level}>`);
			continue;
		}

		// List items
		if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
			trimmed = trimmed.substring(2);
			htmlLines.push(`<li>${formatInlineMarkdown(trimmed)}</li>`);
			continue;
		}

		htmlLines.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
	}

	return htmlLines.join('\n');
};
