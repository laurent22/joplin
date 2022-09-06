const mimeTypes = require('./mime-utils-types');

const mime = {
	fromFileExtension(ext) {
		ext = ext.toLowerCase();
		for (let i = 0; i < mimeTypes.length; i++) {
			const t = mimeTypes[i];
			if (t.e.indexOf(ext) >= 0) {
				return t.t;
			}
		}
		return null;
	},

	fromFilename(name) {
		if (!name) return null;
		const splitted = name.trim().split('.');
		if (splitted.length <= 1) return null;
		return mime.fromFileExtension(splitted[splitted.length - 1]);
	},

	appendExtensionFromMime(name, mimeType) {
		const extensions = mime.toFileExtensions(mimeType);
		if (!extensions.length) return `${name}.bin`;

		for (const ext of extensions) {
			if (name.toLowerCase().endsWith(`.${ext}`)) return name;
		}

		return name += `.${mime.toFileExtension(mimeType)}`;
	},

	toFileExtension(mimeType) {
		const extensions = mime.toFileExtensions(mimeType);

		// Return the first file extension that is 3 characters long
		// If none exist return the first one in the list.
		for (let j = 0; j < extensions.length; j++) {
			if (extensions[j].length === 3) return extensions[j];
		}

		return extensions.length ? extensions[0] : null;
	},

	toFileExtensions(mimeType) {
		mimeType = mimeType.toLowerCase();
		for (let i = 0; i < mimeTypes.length; i++) {
			const t = mimeTypes[i];
			if (mimeType === t.t) {
				return t.e;
			}
		}
		return [];
	},

	fromDataUrl(dataUrl) {
		// Example: data:image/jpeg;base64,/9j/4AAQSkZJR.....
		const defaultMime = 'text/plain';
		const p = dataUrl.substr(0, dataUrl.indexOf(',')).split(';');
		let s = p[0];
		s = s.split(':');
		if (s.length <= 1) return defaultMime;
		s = s[1];
		return s.indexOf('/') >= 0 ? s : defaultMime; // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
	},
};

module.exports = { mime };
