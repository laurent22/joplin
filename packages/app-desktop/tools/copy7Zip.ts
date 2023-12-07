
import { path7za } from '7zip-bin';
import { copy } from 'fs-extra';
import { dirname, join } from 'path';

const copy7Zip = async () => {
	const rootDir = dirname(__dirname);
	await copy(path7za, join(rootDir, 'build', '7zip', '7za'));
};

export default copy7Zip;
