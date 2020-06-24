const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const generateChecksumFile = () => {
	const distDirName = 'dist';
	const distPath = path.join(__dirname, distDirName);
	const infoFileName = 'latest-linux.yml';
	const infoFilePath = path.join(distPath, infoFileName);
	// let isLinux = true;
	// let infoFileDescriptor = -1;
	// fs.open(infoFilePath, (err, fd) => {
	//     if (err) {
	//         console.log("This is not Linux. Nothing more to be done");
	//         isLinux = false;
	//     } else {
	//         infoFileDescriptor = fd;
	//     }
	// });
	// if (!isLinux) {
	//     return [];
	// }
	try {
		const doc = yaml.safeLoad(fs.readFileSync(infoFilePath, 'utf8'));
		const sha512 = doc['sha512'];
		console.log(sha512);
	} catch (e) {
		return [];
	}
};

exports.default = generateChecksumFile;
