// This is used to validate the Markdown filenames. The updateNews script uses the filename as the
// Discourse external_id, however that ID does not support certain characters, such as ".".

import { getRootDir } from '@joplin/utils';
import { fileExtension } from '@joplin/utils/path';
import { readdir } from 'fs/promises';
import { filename } from '@joplin/lib/path-utils';

const supportedExtensions = ['md', 'mdx'];
const allowedRegex = '^[a-zA-Z0-9_-]+$';

const main = async () => {
	const readmeDir = `${await getRootDir()}/readme`;

	const filePaths = await readdir(readmeDir, { recursive: true });

	for (const filePath of filePaths) {
		try {
			const ext = fileExtension(filePath);
			if (!supportedExtensions.includes(ext.toLowerCase())) continue;
			if (!supportedExtensions.includes(ext)) throw new Error(`Invalid extension case (Supported extensions: ${JSON.stringify(supportedExtensions)})`);
			const name = filename(filePath);
			if (!name.match(new RegExp(allowedRegex))) throw new Error(`File format not allowed (Allowed characters: ${allowedRegex})`);
		} catch (error) {
			console.info(`Invalid filename: "${filePath}":`, error.message);
			process.exit(1);
		}
	}
};

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
