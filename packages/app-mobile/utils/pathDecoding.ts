// Utility for URL-decoding file paths on iOS
// Handles special characters that are percent-encoded in URLs (e.g., # becomes %23)
// This is needed because iOS passes file URIs with URL encoding, which must be decoded
// before passing to the native file system APIs

// Decode URL-encoded characters in a file path
// Handles special characters like #, &, ?, % etc. that are encoded in URLs
export const decodeFilePath = (path: string): string => {
	if (!path) {
		return path;
	}

	try {
		// decodeURIComponent handles URL percent-encoding
		return decodeURIComponent(path);
	} catch (error) {
		// In case of invalid encoding, return the original path
		// This prevents crashes if the input is malformed
		console.warn('Failed to decode file path:', path, error);
		return path;
	}
};

// Decode URI-encoded characters in a file URI
// Handles both absolute paths and file:// URIs
export const decodeFileUri = (uri: string): string => {
	if (!uri) {
		return uri;
	}

	try {
		// Remove file:// prefix if present
		if (uri.startsWith('file://')) {
			const path = uri.substring(7); // Remove 'file://'
			return `file://${decodeURIComponent(path)}`;
		}

		// For regular paths, just decode them
		return decodeURIComponent(uri);
	} catch (error) {
		console.warn('Failed to decode file URI:', uri, error);
		return uri;
	}
};
