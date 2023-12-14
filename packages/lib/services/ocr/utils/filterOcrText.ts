export default (text: string) => {
	// Remove all non-letter characters from the string
	const filtered = text.replace(/\P{Letter}/ug, '');
	// If there's nothing left, this is most likely an invalid detection, so we
	// clear the string.
	if (!filtered.trim()) return '';
	return text.trim();
};
