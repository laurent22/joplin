// Safely encodes URI with avoiding of the double-encoding of already encoded parts
function safe_encodeURI(path) {
	let out = '';
	let begin = 0;
	let i;

	if (path == undefined || path === null || path.length === 0) {
		return path;
	}

	// Collecting ranges that should be encoded
	for (i = 0; i < path.length; ) {
		// If valid percent encoding is detected, don't encode it again!
		if (path[i] === '%' && i + 3 < path.length && /[a-fA-F0-9]{2}/.test(path.substring(i + 1, i + 3)))
		{
			if (begin !== i) {
				out += encodeURI(path.substring(begin, i));
			}

			out += path.substring(i, i + 3);
			begin = i + 3;
			i += 3;
		} else {
			++i;
		}
	}

	// If it's a piece at end of string that can be encoded too
	if (begin < i) {
		out += encodeURI(path.substring(begin, i));
	}

	return out;
}

module.exports = { safe_encodeURI: safe_encodeURI };
