
// Converts a string that may contain invalid unicode characters
// to an array of bytes (utf-16 little endian)
//
// Currently only used for testing
const stringToBytes = (text: string) => {
	const buffer = new ArrayBuffer(text.length * 2);
	const view = new DataView(buffer);

	for (let i = 0; i < text.length; i++) {
		// true: Little endian
		view.setUint16(i * 2, text.charCodeAt(i), true);
	}

	// Create the byte array
	const bytes = [];
	for (let i = 0; i < buffer.byteLength; i++) {
		bytes.push(view.getInt8(i));
	}

	return bytes;
};

export default stringToBytes;
