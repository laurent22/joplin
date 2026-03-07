/* eslint-disable multiline-comment-style */

import shim from '../../../shim';

export interface ZipEntry {
	// Full path of the entry within the archive
	entryName: string;
	// Filename of the entry
	name: string;
}

/**
 * Provides file system utilities for plugins.
 *
 * <span class="platform-desktop">desktop</span>
 */
export default class JoplinFs {

	/**
	 * Extracts a ZIP archive to the specified directory.
	 *
	 * <span class="platform-desktop">desktop</span>
	 *
	 * @param sourcePath Path to the ZIP file to extract
	 * @param destinationPath Path to the directory where the contents should be extracted
	 * @returns List of entries extracted from the ZIP file
	 */
	public async zipExtract(sourcePath: string, destinationPath: string): Promise<ZipEntry[]> {
		const entries = await shim.fsDriver().zipExtract({
			source: sourcePath,
			extractTo: destinationPath,
		});

		// Map to plain objects to ensure they can be serialized over IPC
		return entries.map(e => ({
			entryName: e.entryName,
			name: e.name,
		}));
	}

}
