const slugify = require('slugify');

function mergePackageKey(parentKey, source, dest) {
	const output = Object.assign({}, dest);

	for (const k in source) {
		if (k === 'keywords' && !Array.isArray(output[k])) {
			// Fix an earlier bugs where keywords were set to an empty object
			output[k] = source[k];
		} else if (k === 'keywords') {
			// For keywords, make sure to add the "joplin-plugin" one
			if (!output['keywords']) output['keywords'] = [];
			if (output['keywords'].indexOf('joplin-plugin') < 0) output['keywords'].push('joplin-plugin');
		} else if (!(k in output)) {
			// If the key doesn't exist in the destination, add it
			output[k] = source[k];
		} else if (parentKey === 'devDependencies') {
			// If we are dealing with the dependencies, overwrite with the
			// version from source.
			output[k] = source[k];
		} else if (typeof source[k] === 'object' && !Array.isArray(source[k]) && source[k] !== null) {
			// If it's an object, recursively process it
			output[k] = mergePackageKey(k, source[k], output[k]);
		} else {
			// Otherwise, the default is to preserve the destination key
			output[k] = dest[k];
		}
	}

	return output;
}

function mergeIgnoreFile(source, dest) {
	const output = source.split('\n').concat(dest.split('\n'));

	return output.filter(function(item, pos) {
		if (!item) return true; // Leave blank lines
		return output.indexOf(item) === pos;
	}).join('\n');
}

function packageNameFromPluginName(pluginName) {
	let output = pluginName;

	// Replace all special characters with '-'
	output = output.replace(/[*+~.()'"!:@[\]]/g, '-');

	// Slugify to replace non-alphabetical characters by letters
	output = slugify(output, { lower: true });

	// Trim any remaining "-" from beginning of string
	output = output.replace(/^[-]+/, '');

	if (!output) throw new Error(`This plugin name cannot be converted to a package name: ${pluginName}`);

	// Add prefix
	output = `joplin-plugin-${output}`;

	// Package name is limited to 214 characters
	output = output.substr(0, 214);

	// Trim any remaining "-" from end of string
	output = output.replace(/[-]+$/, '');

	return output;
}

module.exports = { mergePackageKey, mergeIgnoreFile, packageNameFromPluginName };
