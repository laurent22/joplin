const fs = require('fs');
const path = require('path');
const os = require('os');
const distDirName = 'dist';
const distPath = path.join(__dirname, distDirName);

const renameLatestYmlFile = () => {
	if (os.platform() === 'darwin' && process.arch === 'arm64') {
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

const mainHook = () => {
	renameLatestYmlFile();
};

exports.default = mainHook;
