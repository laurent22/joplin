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
	// Bare hash, kept for backward compatibility with existing consumers.
	fs.writeFileSync(sha512FilePath, checksum);
	const sha512sumFilePath = path.join(distPath, `${appImageName}.sha512sum`);
	fs.writeFileSync(sha512sumFilePath, `${checksum}  ${appImageName}\n`);
	return [sha512FilePath, sha512sumFilePath];
};

const mainHook = () => {
	return generateChecksumFile() || [];
};

exports.default = mainHook;
