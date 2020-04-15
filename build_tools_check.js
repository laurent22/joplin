const util = require('util');
const exec = util.promisify(require('child_process').exec);

const verifyBuildToolInstallation = async (tool, checkCommand, installCommand) => {
	try {
		const { stdout } = await exec(checkCommand);
		console.log(`${tool} is Installed: ${stdout}`);
	} catch (error) {
		console.warn(`WARNING: This development tool is not installed: "${tool}". Please install it using your package manager. For example: ${installCommand}`);
	}
};

switch (process.platform) {
case 'win32':
	verifyBuildToolInstallation('Windows Build Tools', 'npm list -g windows-build-tools', 'npm install --global windows-build-tools');
	break;
case 'darwin':
	verifyBuildToolInstallation('CocoaPods', 'pod --version', 'sudo gem install cocoapods');
	verifyBuildToolInstallation('rsync', 'rsync --version', 'sudo port install rsync');
	break;
case 'linux':
	verifyBuildToolInstallation('rsync', 'rsync --version', 'sudo apt-get install rsync');
	break;
default:
	console.log('WARNING: Please ensure that you read the documentation to know the necessary build tools that must be installed in your system to successfullly build this project');
}

