/* eslint-disable import/prefer-default-export */

// This is a modified version of the file-uri-to-path package:
//
// - It removes the dependency to the "path" package, which wouldn't work with
//   React Native.
//
// - It always returns paths with forward slashes "/". This is normally handled
//   properly everywhere.
//
// - Adds the "platform" parameter to optionally return paths with "\" for win32
function fileUriToPath_(uri: string, platform: string) {
	const sep = '/';

	if (
		typeof uri !== 'string' ||
		uri.length <= 7 ||
		uri.substring(0, 7) !== 'file://'
	) {
		throw new TypeError(
			'must pass in a file:// URI to convert to a file path',
		);
	}

	const rest = decodeURI(uri.substring(7));
	const firstSlash = rest.indexOf('/');
	let host = rest.substring(0, firstSlash);
	let path = rest.substring(firstSlash + 1);

	// 2.  Scheme Definition
	// As a special case, <host> can be the string "localhost" or the empty
	// string; this is interpreted as "the machine from which the URL is
	// being interpreted".
	if (host === 'localhost') {
		host = '';
	}

	if (host) {
		host = sep + sep + host;
	}

	// 3.2  Drives, drive letters, mount points, file system root
	// Drive letters are mapped into the top of a file URI in various ways,
	// depending on the implementation; some applications substitute
	// vertical bar ("|") for the colon after the drive letter, yielding
	// "file:///c|/tmp/test.txt".  In some cases, the colon is left
	// unchanged, as in "file:///c:/tmp/test.txt".  In other cases, the
	// colon is simply omitted, as in "file:///c/tmp/test.txt".
	path = path.replace(/^(.+)\|/, '$1:');

	// for Windows, we need to invert the path separators from what a URI uses
	// if (sep === '\\') {
	// 	path = path.replace(/\//g, '\\');
	// }

	if (/^.+:/.test(path)) {
		// has Windows drive at beginning of path
	} else {
		// unix path…
		path = sep + path;
	}

	if (platform === 'win32') {
		return (host + path).replace(/\//g, '\\');
	} else {
		return host + path;
	}
}

export const fileUriToPath = (path: string, platform = 'linux') => {
	const output = fileUriToPath_(path, platform);

	// The file-uri-to-path module converts Windows path such as
	//
	// file://c:/autoexec.bat => \\c:\autoexec.bat
	//
	// Probably because a file:// that starts with only two slashes is not
	// quite valid. If we use three slashes, it works:
	//
	// file:///c:/autoexec.bat => c:\autoexec.bat
	//
	// However there are various places in the app where we can find
	// paths with only two slashes because paths are often constructed
	// as `file://${resourcePath}` - which works in all OSes except
	// Windows.
	//
	// So here we introduce a special case - if we detect that we have
	// an invalid Windows path that starts with \\x:, we just remove
	// the first two backslashes.
	//
	// https://github.com/laurent22/joplin/issues/5693

	if (output.match(/^\/\/[a-zA-Z]:/)) {
		return output.substr(2);
	}

	return output;
};

export const isDataUrl = (path: string) => {
	return path.startsWith('data:');
};

export const hasProtocol = (url: string, protocol: string | string[]) => {
	if (!url) return false;

	const protocols = typeof protocol === 'string' ? [protocol] : protocol;
	url = url.toLowerCase();
	for (const p of protocols) {
		if (url.startsWith(`${p.toLowerCase()}://`)) return true;
	}
	return false;
};
