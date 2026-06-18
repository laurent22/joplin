export interface ArchiveEntry {
    entryName: string;
    name: string;
}
/**
 * Provides file system utilities for plugins.
 *
 * <span class="platform-desktop">desktop</span>
 */
export default class JoplinFs {
    /**
     * Extracts an archive to the specified directory. Currently only ZIP files
     * are supported.
     *
     * <span class="platform-desktop">desktop</span>
     *
     * @param sourcePath Path to the archive file to extract
     * @param destinationPath Path to the directory where the contents should be extracted
     * @returns List of entries extracted from the archive
     */
    archiveExtract(sourcePath: string, destinationPath: string): Promise<ArchiveEntry[]>;
}
