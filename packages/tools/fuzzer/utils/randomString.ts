type OnRandomInt = (low: number, high: number)=> number;

const randomString = (nextRandomInteger: OnRandomInt) => (length: number) => {
	const charCodes = [];
	for (let i = 0; i < length; i++) {
		charCodes.push(nextRandomInteger(0, 0xFFFF));
	}

	let text = String.fromCharCode(...charCodes);
	// Normalize to avoid differences when reading/writing content from Joplin clients.
	// TODO: Can the note comparison logic be adjusted to remove some of this?
	text = text.normalize();
	text = text.replace(/[\r\b\f\v\0\u007F]/g, '!');
	text = text.replace(/\p{C}/ug, '-'); // Other control characters

	// Remove invalid UTF-8
	text = new TextDecoder().decode(new TextEncoder().encode(text));

	// Attempt to work around issues related to unexpected differences in items when reading from
	// the Joplin client: Remove certain invalid unicode:
	if ('toWellFormed' in String.prototype && typeof String.prototype.toWellFormed === 'function') {
		// toWellFormed requires Node >= v20
		text = String.prototype.toWellFormed.call(text);
	}

	return text;
};

export default randomString;
