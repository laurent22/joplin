const slugify = require('slugify');

// "source" is the framework current version.
// "dest" is the user existing version.
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
			// version from source. Note that it can be a problem if the user
			// prefers a specific package version but it is hard to avoid,
			// otherwise it's not possible to upgrade the dependencies when the
			// framework changes.
			output[k] = source[k];
		} else if (typeof source[k] === 'object' && !Array.isArray(source[k]) && source[k] !== null) {
			// If it's an object, recursively process it
			output[k] = mergePackageKey(k, source[k], output[k]);
		} else if (parentKey === 'scripts' && ['dist', 'prepare', 'update'].includes(k)) {
			// When merging scripts, we need to take certain keys from source
			// because if they aren't right, the plugin might not build
			// correctly.
			output[k] = source[k];
		} else {
			// Otherwise, the default is to preserve the destination key
			output[k] = dest[k];
		}
	}

	return output;
}

function mergeIgnoreFile(source, dest) {
	const output = dest.trim().split(/\r?\n/).concat(source.trim().split(/\r?\n/));

	return `${output.filter((item, pos) => {
		if (!item) return true; // Leave blank lines
		return output.indexOf(item) === pos;
	}).join('\n').trim()}\n`;
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
