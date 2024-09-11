const fs = require('fs');
const path = require('path');
const os = require('os');
const sha512 = require('js-sha512');
const crypto = require('crypto');
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
	fs.writeFileSync(sha512FilePath, checksum);
	return sha512FilePath;
};

const generateLatestArm64Yml = () => {
	if (os.platform() !== 'darwin' && process.arch !== 'arm64') {
		return;
	}

	const calculateHash = (filePath) => {
		const fileBuffer = fs.readFileSync(filePath);
		const hashSum = crypto.createHash('sha512');
		hashSum.update(fileBuffer);
		return hashSum.digest('base64');
	};

	const getFileSize = (filePath) => {
		return fs.statSync(filePath).size;
	};

	const extractVersion = (filePath) => {
		return path.basename(filePath).split('-')[1];
	};

	const files = fs.readdirSync(distPath);
	let dmgPath = '';
	let zipPath = '';
	for (const file of files) {
		if (file.endsWith('arm64.dmg')) {
			const fileRenamed = `${file.slice(0, -4)}.DMG`; // renameReleaseAssets script will rename from .dmg to .DMG
			dmgPath = path.join(distPath, fileRenamed);
		} else if (file.endsWith('arm64.zip')) {
			zipPath = path.join(distPath, file);
		}
	}
	const versionFromFilePath = extractVersion(zipPath);

	const info = {
		version: versionFromFilePath,
		dmgPath: dmgPath,
		zipPath: zipPath,
		releaseDate: new Date().toISOString(),
	};

	/* eslint-disable no-console */
	if (!fs.existsSync(info.dmgPath) || !fs.existsSync(info.zipPath)) {
		console.error('One or both executable files do not exist:', info.dmgPath, info.zipPath);
		return;
	}

	console.info('Calculating hash of files...');
	const dmgHash = calculateHash(info.dmgPath);
	const zipHash = calculateHash(info.zipPath);

	console.info('Calculating size of files...');
	const dmgSize = getFileSize(info.dmgPath);
	const zipSize = getFileSize(info.zipPath);

	console.info('Generating content of latest-mac-arm64.yml file...');
	const yamlFilePath = path.join(distPath, 'latest-mac-arm64.yml');
	const yamlContent = `version: ${info.version}
files:
  - url: ${path.basename(info.zipPath)}
    sha512: ${zipHash}
    size: ${zipSize}
  - url: ${path.basename(info.dmgPath)}
    sha512: ${dmgHash}
    size: ${dmgSize}
path: ${path.basename(info.zipPath)}
sha512: ${zipHash}
releaseDate: '${info.releaseDate}'
`;
	fs.writeFileSync(yamlFilePath, yamlContent);
	console.log('YML file generated successfully for arm64 architecure.');

	const fileContent = fs.readFileSync(yamlFilePath, 'utf8');
	console.log('Generated YML Content:\n', fileContent);
	/* eslint-enable no-console */
	return yamlFilePath;
};

const mainHook = () => {
	const sha512FilePath = generateChecksumFile();
	const lastestArm64YmlFilePath = generateLatestArm64Yml();
	const outputFiles = [sha512FilePath, lastestArm64YmlFilePath].filter(item => item);
	return outputFiles;
};

exports.default = mainHook;
