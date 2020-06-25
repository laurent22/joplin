const fs = require('fs');
const path = require('path');
const sha512 = require('js-sha512');

const generateChecksumFile = () => {
	const distDirName = 'dist';
	const distPath = path.join(__dirname, distDirName);
	let appImageName = '';
	try {
		const files = fs.readdirSync(distPath);
		for (const key in files) {
			const filename = files[key];
			if (filename.includes('AppImage')) {
				appImageName = filename;
				break;
			}
		}
		if (appImageName === '') {
			// That mean we are not on Linux
			return [];
		}
		try {
			const appImagePath = path.join(distPath, appImageName);
			const appImageContent = fs.readFileSync(appImagePath);
			const checksum = sha512.sha512(appImageContent);
			const sha512FileName = `${appImageName}.sha512`;
			const sha512FilePath = path.join(distPath, sha512FileName);
			fs.writeFileSync(sha512FilePath, checksum);
			return [sha512FilePath];
		} catch (e) {
			console.error('Could not generate checksum file');
			return [];
		}
	} catch (e) {
		console.error('Please run "npm run dist" first');
		return [];
	}
};

exports.default = generateChecksumFile;
