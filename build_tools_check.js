const util = require('util');
const exec = util.promisify(require('child_process').exec);

let OSName = '';
if (process.platform === 'win32')   OSName = 'Windows';
if (process.platform === 'darwin')  OSName = 'MacOS';
if (process.platform === 'linux')   OSName = 'Linux';

const verifyBuildToolInstallation = async (tool, checkCommand, installCommand = null) => {
	try {
		const { stdout } = await exec(checkCommand);
		console.log(`${tool} is Installed: ${stdout}`);
	} catch (error) {
		installCommand ? installBuildTool(tool, installCommand) : console.warn(`WARNING: Please ensure that ${tool} is installed on your system`);
	}
};

const installBuildTool = async (tool, command) =>  {
	const message = `Installing ${tool}....`;
	console.log(message);
	try {
		const { stdout } = await exec(command);
		console.log(stdout);
		console.log(`${tool} Installed Successfully`);
	} catch (error) {
		console.log(error);
		console.log(`Something went wrong, Please ensure that ${tool} is installed in your system before proceeding`);
	}
};

switch (OSName) {
case 'Windows':
	verifyBuildToolInstallation('Windows Build Tools', 'npm ls -g windows-build-tools', 'npm install --global windows-build-tools');
	break;
case 'MacOS':
	verifyBuildToolInstallation('CocoaPods', 'pod --version', 'sudo gem install cocoapods');
	verifyBuildToolInstallation('Rsync', 'rsync -version');
	break;
case 'Linux':
	verifyBuildToolInstallation('Rsync', 'rsync -version', 'apt-get install rsync');
	break;
default:
	console.log('WARNING: Please ensure that you read the documentation to know the necessary build tools that must be installed in your system to successfullly build this project');
}
