
// Encodes `title` into a file-system-safe format that preserves as many characters
// as is safe.
const encodeTitle = (title: string) => {
	// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent#encoding_for_rfc3986
	return title.replace(
		/[%!\\/)]/g,
		c => `%${c.charCodeAt(0).toString(16)}`,
	);
};

export default encodeTitle;
