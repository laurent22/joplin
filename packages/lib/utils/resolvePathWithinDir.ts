
import * as path from 'path';

// Returns `null` if `relativePath` is not within `baseDir` and `relativePath`
// resolved to an absolute path otherwise.
//
// `relativePath` can be either relative or absolute.
// If relative, it is assumed to be relative to `baseDir`.
//
// It is expected that baseDir is a safe path (not user-provided).
const resolvePathWithinDir = (
	baseDir: string, relativePath: string,

	// For testing
	pathModule = path,
) => {
	let resolvedBaseDir = pathModule.resolve(baseDir);
	const resolvedPath = pathModule.resolve(baseDir, relativePath);

	// Handles the case where resolvedBaseDir doesn't end with a
	// path separator. For example, if
	//   resolvedBaseDir="/foo/bar"
	// then we could have
	//   resolvedPath="/foo/bar2"
	// which is not within the "/foo/bar" directory.
	//
	// We can't do this if the two paths are already equal as (as this would cause
	// resolvedPath to no longer start with resolvedBaseDir).
	if (!resolvedBaseDir.endsWith(pathModule.sep) && resolvedBaseDir !== resolvedPath) {
		resolvedBaseDir += pathModule.sep;
	}

	if (!resolvedPath.startsWith(resolvedBaseDir)) {
		return null;
	}

	return resolvedPath;
};

export default resolvePathWithinDir;
