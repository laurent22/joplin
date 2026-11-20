const fs = require('fs');
const path = require('path');
const os = require('os');
const sha512 = require('js-sha512');
const distDirName = 'dist';
const distPath = path.join(__dirname, distDirName);

const generateChecksumFile = () => {
	if (os.platform() !== 'linux') {
		return; // SHA-512 is only for AppImage
	}

	let appImageName = '';
	const files = fs.readdirSync(distPath);
	for (const key in files) {
		const filename = files[key];
		if (filename.includes('AppImage')) {
			appImageName = filename;
			break;
		}
	}
	if (appImageName === '') {
		throw new Error('AppImage not found!');
	}
	const appImagePath = path.join(distPath, appImageName);
	const appImageContent = fs.readFileSync(appImagePath);
	const checksum = sha512.sha512(appImageContent);
	const sha512FileName = `${appImageName}.sha512`;
	const sha512FilePath = path.join(distPath, sha512FileName);
	// The `.sha512` file is a bare hash for existing consumers, before `.sha512sum` was introduced.
	fs.writeFileSync(sha512FilePath, checksum);
	// This one supports `sha512sum --check <file>.sha512sum`.
	const sha512sumFilePath = path.join(distPath, `${appImageName}.sha512sum`);
	fs.writeFileSync(sha512sumFilePath, `${checksum}  ${appImageName}\n`);
	return [sha512FilePath, sha512sumFilePath];
};

const mainHook = () => {
	return generateChecksumFile() || [];
};

exports.default = mainHook;
