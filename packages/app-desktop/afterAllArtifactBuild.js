const fs = require('fs');
const path = require('path');
const os = require('os');
const sha512 = require('js-sha512');
const packagesDirName = 'packages';
const appDesktopDirname = 'app-desktop';
const distDirName = 'dist';

const renameLatestYmlFile = () => {
	if (os.platform() === 'darwin' && process.arch === 'arm64') {
		const distPath = path.join(__dirname, packagesDirName, appDesktopDirname, distDirName);
		const latestMacFilePath = path.join(distPath, 'latest-mac.yml');
		const renamedMacFilePath = path.join(distPath, 'latest-mac-arm64.yml');

		if (fs.existsSync(latestMacFilePath)) {
			fs.renameSync(latestMacFilePath, renamedMacFilePath);
			return [renamedMacFilePath];
		} else {
			throw new Error('latest-mac.yml not found!');
		}
	}
};

const generateChecksumFile = () => {
	if (os.platform() !== 'linux') {
		return []; // SHA-512 is only for AppImage
	}

	const distPath = path.join(__dirname, distDirName);
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
	fs.writeFileSync(sha512FilePath, checksum);
	return [sha512FilePath];
};

const mainHook = () => {
	renameLatestYmlFile();
	generateChecksumFile();
};

exports.default = mainHook;
