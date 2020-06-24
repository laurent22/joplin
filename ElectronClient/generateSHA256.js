const fs = require('fs');
const path = require('path');

const generateChecksumFile = () => {
	const distDirName = 'dist';
	const distPath = path.join(__dirname, distDirName);
	fs.readdir(distPath, (err, files) => {
		if (err) {
			// Shouldn't come here
			console.error('Couldn\'t open dist directory');
		} else {
			for (const file in files) {
				console.log(files[file]);
			}
		}
	});
};

exports.default = generateChecksumFile;
